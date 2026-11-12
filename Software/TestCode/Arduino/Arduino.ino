// ----------------------------------------------------
// UART BUFFER
// ----------------------------------------------------
#define UART_BUFFER_SIZE 64
char uartBuffer[UART_BUFFER_SIZE];
int  uartIndex = 0;

// ----------------------------------------------------
// PINS
// ----------------------------------------------------
#define X_STEP_PIN  2
#define X_DIR_PIN   5

#define Y_STEP_PIN  3
#define Y_DIR_PIN   6

#define Z_STEP_PIN  4
#define Z_DIR_PIN   7

#define ENABLE_PIN  8
#define LIMIT_PIN   9      // NC wiring: LOW = free, HIGH = triggered

// ----------------------------------------------------
// STEPPER CONFIG
// ----------------------------------------------------
#define PULSE_WIDTH_US  300    
#define INTERVAL_US     2000    // tijd tussen stappen (µs)
#define STEPS_PER_TICK  2       // aantal stappen per tick

// ----------------------------------------------------
// STATE
// ----------------------------------------------------
unsigned long lastStepX = 0;
unsigned long lastStepY = 0;
unsigned long lastStepZ = 0;

unsigned long dirTimer = 0;
bool direction = false;   // false = links (LOW), true = rechts (HIGH)

// ----------------------------------------------------
// FORWARD DECLARATIONS
// ----------------------------------------------------
void homeAxis();
void updateMotors();

// ====================================================
void setup() {
  Serial.begin(9600);

  pinMode(X_STEP_PIN, OUTPUT);
  pinMode(X_DIR_PIN,  OUTPUT);

  pinMode(Y_STEP_PIN, OUTPUT);
  pinMode(Y_DIR_PIN,  OUTPUT);

  pinMode(Z_STEP_PIN, OUTPUT);
  pinMode(Z_DIR_PIN,  OUTPUT);

  pinMode(ENABLE_PIN, OUTPUT);
  pinMode(LIMIT_PIN,  INPUT_PULLUP);

  digitalWrite(ENABLE_PIN, LOW);

  delay(300);
  homeAxis();

  Serial.println("System ready.");

  dirTimer = millis();   // start timer
}

// ====================================================
void loop() {
  updateMotors();
}

// ====================================================
// NON-BLOCKING MOTOR SCHEDULER
// ====================================================
void updateMotors() {
  unsigned long nowMicros = micros();
  unsigned long nowMs     = millis();

  // ---- 3 seconden links → 3 seconden rechts ----
  if (nowMs - dirTimer >= 3000) {
    direction = !direction;   // flip direction
    dirTimer = nowMs;
  }

  // ----------------------------------------------------
  // X AXIS
  // ----------------------------------------------------
  if (nowMicros - lastStepX >= INTERVAL_US) {
    lastStepX = nowMicros;

    digitalWrite(X_DIR_PIN, direction ? HIGH : LOW);

    for (int i = 0; i < STEPS_PER_TICK; i++) {
      digitalWrite(X_STEP_PIN, HIGH);
      delayMicroseconds(PULSE_WIDTH_US);
      digitalWrite(X_STEP_PIN, LOW);
      delayMicroseconds(PULSE_WIDTH_US);
    }
  }

  // ----------------------------------------------------
  // Y AXIS
  // ----------------------------------------------------
  if (nowMicros - lastStepY >= INTERVAL_US) {
    lastStepY = nowMicros;

    digitalWrite(Y_DIR_PIN, direction ? HIGH : LOW);

    for (int i = 0; i < STEPS_PER_TICK; i++) {
      digitalWrite(Y_STEP_PIN, HIGH);
      delayMicroseconds(PULSE_WIDTH_US);
      digitalWrite(Y_STEP_PIN, LOW);
      delayMicroseconds(PULSE_WIDTH_US);
    }
  }

  // ----------------------------------------------------
  // Z AXIS
  // ----------------------------------------------------
  if (nowMicros - lastStepZ >= INTERVAL_US) {
    lastStepZ = nowMicros;

    digitalWrite(Z_DIR_PIN, direction ? HIGH : LOW);

    for (int i = 0; i < STEPS_PER_TICK; i++) {
      digitalWrite(Z_STEP_PIN, HIGH);
      delayMicroseconds(PULSE_WIDTH_US);
      digitalWrite(Z_STEP_PIN, LOW);
      delayMicroseconds(PULSE_WIDTH_US);
    }
  }
}

// ====================================================
// HOMING (alleen Y zoals origineel)
// ====================================================
void stepOnce(int halfPeriodUs) {
  digitalWrite(Y_STEP_PIN, HIGH);
  delayMicroseconds(halfPeriodUs);
  digitalWrite(Y_STEP_PIN, LOW);
  delayMicroseconds(halfPeriodUs);
}

void homeAxis() {
  Serial.println("Homing...");

  digitalWrite(Y_DIR_PIN, LOW);
  unsigned long startMs = millis();
  while (digitalRead(LIMIT_PIN) == LOW) {
    stepOnce(1200);
    if (millis() - startMs > 10000UL) {
      Serial.println("ERROR: homing timeout — check wiring.");
      return;
    }
  }
  Serial.println("Switch hit.");

  digitalWrite(Y_DIR_PIN, HIGH);
  for (int i = 0; i < 700; i++) stepOnce(1200);

  Serial.println("Homing done.");
}
