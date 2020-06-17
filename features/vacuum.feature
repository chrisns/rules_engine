Feature: Vacuum so long as the alarm isn't on

  Scenario: Start the vacuum in the morning so long as the alarm isn't armed away
    Given cron "0 30 8 * * *"
    And the alarm is not "Away"
    Then the vacuum should start