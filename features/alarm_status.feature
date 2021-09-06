Feature: Alarm status changes

  Scenario: Alarm is disarmed take pictures
    Given the alarm state changes to "Disarm"
    And a screengrab of the "Porch camera" is sent to "chris"
    And a screengrab of the "Front camera" is sent to "chris"
    And a screengrab of the "Back camera" is sent to "chris"
    And a screengrab of the "Driveway camera" is sent to "chris"

  Scenario: Someone turns on the garage light and the alarm is armed home
    When the "Garage lights" "Switch" is turned on
    And the alarm is "Home"
    Then the "Garage" speaker says "Alarm is armed home"

  Scenario: Someone turns on the garage light and the alarm is disarmed
    When the "Garage lights" "Switch" is turned on
    And the alarm is "Disarm"
    Then the "Garage" speaker says "Alarm is disarmed"

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