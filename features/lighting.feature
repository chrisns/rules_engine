Feature: Lighting

  Scenario: Someone walks in to the kitchen and its dark
    Given there is movement is detected on the "Kitchen multisensor"
    And the "Kitchen multisensor" is reporting "user" - "Luminance" less than 20
    And the "Kitchen lights" is reporting "user" - "Level" less than 1
    Then the "Kitchen lights" user "Level" should be "10"


  Scenario: Remind Kitchen lights to use bi stable switches
    Given the "Kitchen lights" is reporting config "Inputs Button/Switch configuration" not "Bi-stable input (switch)"
    Then the "Kitchen lights" config "Inputs Button/Switch configuration" should be "Bi-stable input (switch)"


  Scenario: Remind Lounge lights to use bi stable switches
    Given the "Lounge lights" is reporting config "Inputs Button/Switch configuration" not "Bi-stable input (switch)"
    Then the "Lounge lights" config "Inputs Button/Switch configuration" should be "Bi-stable input (switch)"


  Scenario: Remind Kitchen counter lights to use bi stable switches
    Given the "Kitchen counter lights" is reporting config "Inputs Button/Switch configuration" not "Bi-stable input (switch)"
    Then the "Kitchen counter lights" config "Inputs Button/Switch configuration" should be "Bi-stable input (switch)"


  Scenario: Remind Lounge lights to use Follow switch contact
    Given the "Lounge lights" is reporting config "Inputs behaviour" not "Follow switch contact (closed=ON, open=OFF)"
    Then the "Lounge lights" config "Inputs behaviour" should be "Follow switch contact (closed=ON, open=OFF)"


  Scenario: Remind Kitchen counter lights to use Follow switch contact
    Given the "Kitchen counter lights" is reporting config "Inputs behaviour" not "Follow switch contact (closed=ON, open=OFF)"
    Then the "Kitchen counter lights" config "Inputs behaviour" should be "Follow switch contact (closed=ON, open=OFF)"
