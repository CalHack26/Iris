// =====================================================================
// Soma wearable → Supabase ingest function.
//
// Setup:
//   1. Copy secrets.example.h to secrets.h and fill in WiFi, INGEST_URL, DEVICE_TOKEN.
//   2. Put the real sensor reads in readSensors(). Use NAN for anything not wired yet.
//   3. Set TOUCH_PIN to the touch sensor's digital output.
//
// Sends one reading every 5 s, and a tap on the touch sensor's rising edge.
// The Serial monitor (115200) prints each server reply, including any value
// it ignored as out of range.
// =====================================================================
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <time.h>
#include <math.h>
#include "secrets.h"

const int TOUCH_PIN = 4;                   // digital out of the touch sensor (HIGH when touched)
const unsigned long READ_EVERY_MS = 5000;
const unsigned long DEBOUNCE_MS = 50;
const int TAP_TRIES = 3;                   // a lost tap is a lost log, so retry; the server drops repeats
const time_t CLOCK_SET_AFTER = 1704067200; // 2024-01-01: before this NTP hasn't synced yet

struct Reading {
  float hr;        // heart rate, bpm (server accepts 20-250)
  float skinC;     // skin temp, °C (20-45)
  float airC;      // ambient temp, °C (-30-60)
  float hum;       // humidity, % (0-100)
  float motionG;   // accel magnitude, g (>= 0)
};

// ---------------------------------------------------------------------
// Replace the NANs with real reads as sensors get wired up.
// ---------------------------------------------------------------------
Reading readSensors() {
  Reading r;
  r.hr = NAN;
  r.skinC = NAN;
  r.airC = NAN;
  r.hum = NAN;
  r.motionG = NAN;
  return r;
}

// ---------------------------------------------------------------------

bool clockSet() { return time(nullptr) > CLOCK_SET_AFTER; }

/** Current UTC time as ISO 8601, e.g. 2026-10-25T19:42:10Z. Only call once clockSet() is true. */
void isoNow(char *out, size_t len) {
  time_t now = time(nullptr);
  struct tm utc;
  gmtime_r(&now, &utc);
  strftime(out, len, "%Y-%m-%dT%H:%M:%SZ", &utc);
}

/** Appends `"key":value,` unless the value is NAN. */
void addField(char *buf, size_t len, const char *key, float v) {
  if (isnan(v)) return;
  size_t used = strlen(buf);
  snprintf(buf + used, len - used, "\"%s\":%.2f,", key, v);
}

/** POSTs a JSON body; returns the HTTP status (<= 0 means it never reached the server). */
int post(const char *body) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi down, skipping send");
    WiFi.reconnect();
    return -1;
  }
  WiFiClientSecure client;
  client.setInsecure(); // hackathon shortcut: skips TLS certificate checks. Pin Supabase's root CA before real use.
  HTTPClient http;
  http.setTimeout(5000);
  http.begin(client, INGEST_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-token", DEVICE_TOKEN);
  int status = http.POST((uint8_t *)body, strlen(body));
  Serial.printf("-> %s\n<- %d %s\n", body, status, status > 0 ? http.getString().c_str() : http.errorToString(status).c_str());
  http.end();
  return status;
}

void sendReading() {
  Reading r = readSensors();
  char fields[160] = "";
  addField(fields, sizeof fields, "hr", r.hr);
  addField(fields, sizeof fields, "skin_c", r.skinC);
  addField(fields, sizeof fields, "air_c", r.airC);
  addField(fields, sizeof fields, "hum", r.hum);
  addField(fields, sizeof fields, "motion_g", r.motionG);
  if (!fields[0]) {
    Serial.println("No sensor values yet (all NAN), nothing to send");
    return;
  }
  fields[strlen(fields) - 1] = '\0'; // drop trailing comma

  char body[256];
  if (clockSet()) {
    char t[24];
    isoNow(t, sizeof t);
    snprintf(body, sizeof body, "{\"readings\":[{\"t\":\"%s\",%s}]}", t, fields);
  } else {
    snprintf(body, sizeof body, "{\"readings\":[{%s}]}", fields);
  }
  post(body);
}

void sendTap() {
  char body[96];
  if (clockSet()) {
    char t[24];
    isoNow(t, sizeof t);
    snprintf(body, sizeof body, "{\"tap\":true,\"tap_at\":\"%s\"}", t);
  } else {
    snprintf(body, sizeof body, "{\"tap\":true}");
  }
  for (int i = 0; i < TAP_TRIES; i++) {
    int status = post(body);
    if (status > 0 && status < 500) return; // delivered (or rejected for a reason a retry won't fix)
    delay(500);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(TOUCH_PIN, INPUT);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("WiFi");
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) {
    delay(250);
    Serial.print(".");
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? " connected" : " not connected yet, will keep trying");

  configTime(0, 0, "pool.ntp.org", "time.nist.gov"); // UTC; syncs in the background
}

void loop() {
  static unsigned long lastRead = 0;
  static int lastTouch = LOW;
  static unsigned long lastTouchChange = 0;

  int touch = digitalRead(TOUCH_PIN);
  if (touch != lastTouch && millis() - lastTouchChange > DEBOUNCE_MS) {
    lastTouchChange = millis();
    if (touch == HIGH) {
      Serial.println("Tap!");
      sendTap();
    }
    lastTouch = touch;
  }

  if (millis() - lastRead >= READ_EVERY_MS) {
    lastRead = millis();
    sendReading();
  }
}
