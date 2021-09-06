Feature: Alarm status changes

  Scenario: Alarm is disarmed take pictures
    Given the alarm state changes to "Disarm"
    And a screengrab of the "Porch camera" is sent to "chris"
    And a screengrab of the "Front camera" is sent to "chris"
    And a screengrab of the "Back camera" is sent to "chris"
    And a screengrab of the "Driveway camera" is sent to "chris"

