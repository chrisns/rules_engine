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

  Scenario: Alarm is armed away close the velux window
    Given the alarm state changes to "Away"
    Then the velux scene "Loft Blind 0" is activated
    And the velux scene "Loft Window 0" is activated

  Scenario: Alarm is disarmed open the loft blind
    Given the alarm state changes to "Away"
    And the current time is after sunrise
    And the current time is before sunset
    Then the velux scene "Loft Blind 100" is activated

  Scenario: Alarm is armed away turn everything off
    Given the alarm state changes to "Away"
    Then turn everything off