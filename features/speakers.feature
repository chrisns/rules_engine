Feature: Lounge speaker volume

  Scenario: Daytime TV speaker
    Given cron "* 6-17 * * *"
    Then the "Lounge" speaker nightmode should be off

  Scenario: Nighttime TV speaker
    Given cron "* 18-23 * * *"
    Then the "Lounge" speaker nightmode should be on

Feature: Bathroom speaker
  Scenario: Button is pushed on bathroom light switch twice play the toothbrush song
    When the "Family bathroom lights" button 24 is pushed
    Then the "Bathroom" speaker should play "x-sonos-http:song%3a369569522.mp4?sid=204&flags=8224&sn=1" at 50%

  Scenario: Button is pushed on bathroom light switch thrice stop the music
    When the "Family bathroom lights" button 25 is pushed
    Then the "Bathroom" speaker should pause

