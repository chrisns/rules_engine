Feature: Rack Alerts

  Scenario: Rack cupboard door has been opened
    When the "Rack cupboard door" "Sensor" is turned on
    Then a message reading "Cupboard door open" is sent to "chris"
