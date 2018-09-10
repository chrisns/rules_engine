Feature: Alarm status changes

  Scenario: Alarm is disarmed
    Given the alarm state changes to "Disarm"
    Then a message reading "Alarm disarmed" is sent to "everyone"
    And the "Kitchen" speaker says "Alarm is disarmed"

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

  Scenario: Someone turns on the garage lixght and the alarm is armed home
    When the "Garage lights" "Switch-1" is turned on
    And the alarm is "Home"
    Then the "Garage" speaker says "Alarm is armed home"

  Scenario: Someone turns on the garage light and the alarm is disarmed
    When the "Garage lights" "Switch-1" is turned on
    And the alarm is "Disarm"
    Then the "Garage" speaker says "Alarm is disarmed"
