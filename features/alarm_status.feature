Feature: Alarm status changes

  Scenario: Alarm is disarmed
    Given the alarm state changes to "Disarm"
    Then a message reading "Alarm disarmed" is sent to "everyone"

  Scenario: Alarm is disarmed take pictures
    Given the alarm state changes to "Disarm"
    And a screengrab of the "Porch camera" is sent to "chris"
    And a screengrab of the "Front camera" is sent to "chris"
    And a screengrab of the "Back camera" is sent to "chris"
    And a screengrab of the "Driveway camera" is sent to "chris"

  Scenario: Alarm is armed home
    Given the alarm state changes to "Home"
    Then a message reading "Alarm armed Home" is sent to "everyone"

  Scenario: Alarm is armed away
    Given the alarm state changes to "Away"
    Then a message reading "Alarm armed Away" is sent to "everyone"

  Scenario: Alarm is armed away make sure vacuum stops
    Given the alarm state changes to "Away"
    Then the vacuum should stop

  Scenario: Someone turns on the garage light and the alarm is armed home
    When the "Garage lights" "Switch" is turned on
    And the alarm is "Home"
    Then the "Garage" speaker says "Alarm is armed home"

  Scenario: Someone turns on the garage light and the alarm is disarmed
    When the "Garage lights" "Switch" is turned on
    And the alarm is "Disarm"
    Then the "Garage" speaker says "Alarm is disarmed"

  Scenario: Alarm is armed away turn everything off
    Given the alarm state changes to "Away"
    Then turn everything off

  Scenario: Alarm is armed away lock the garage door
    Given the alarm state changes to "Away"
    Then the "Garage door lock" user "Locked" should be on

  Scenario: Alarm is armed home lock the garage door
    Given the alarm state changes to "Home"
    Then the "Garage door lock" user "Locked" should be on

  Scenario: Alarm is armed away close the velux window
    Given the alarm state changes to "Away"
    Then the velux "Loft Blind" is set to 100%
    Then the velux "Loft Window" is set to 99%

  Scenario: Alarm is armed away turn everything off
    Given the alarm state changes to "Away"
    Then turn everything off

  Scenario: Mute the doorlock on disarm
    Given the alarm state changes to "Disarm"
    Then the "front door lock" config "Audio Mode" should be "Silent"

  Scenario: Volume on the doorlock on away
    Given the alarm state changes to "Away"
    Then the "front door lock" config "Audio Mode" should be "High"

  Scenario: Forgot to arm home
    Given cron "0 0 0 * * *"
    And the alarm is "Disarm"
    Then a message reading "I armed the alarm home because it looks like you forgot to" is sent to "everyone"
    And the alarm state should be "Arm_Home"

