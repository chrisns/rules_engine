Feature: Lounge speaker volume

  Scenario: Daytime TV speaker
    Given a clock tic
    And the time is between "6am" and "6pm"
    Then the "Lounge" speaker nightmode should be off

  Scenario: Nighttime TV speaker
    Given a clock tic
    And the time is between "6pm" and "11pm"
    Then the "Lounge" speaker nightmode should be on

# @TODO
# Feature: Bathroom speaker
#   Scenario: Button is pushed on bathroom light switch twice play the toothbrush song
#     When the "Family bathroom lights" button 24 is pushed
#     Then the "Lounge" speaker should play "url"

#   Scenario: Button is pushed on bathroom light switch thrice stop the music
#     When the "Family bathroom lights" button 25 is pushed
#     Then the "Lounge" speaker should stop