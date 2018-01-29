Feature: Alarm status changes

  Scenario: Alarm state changes
    Given the alarm state changes
    Then a message reading "Alarm state changed to _message.current.state.reported.state_, it was _message.previous.state.reported.state_" is sent to "everyone"

  Scenario: Alarm is changes to disarmed
    Given the alarm state changes
    Then a message reading "Alarm state changed to _message.current.state.reported.state_, it was _message.previous.state.reported.state_" is sent to "everyone"
