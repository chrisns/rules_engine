Feature: Vacuum so long as the alarm isn't on

  Scenario: Start the vacuum in the morning so long as the alarm isn't armed away weekdays
    Given cron "0 30 8 * * 1-5"
    And the alarm is not "Away"
    Then the vacuum should start

  Scenario: Start the vacuum in the morning so long as the alarm isn't armed away weekends
    Given cron "0 45 9 * * 6,0"
    And the alarm is not "Away"
    Then the vacuum should start