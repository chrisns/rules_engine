Feature: Lighting

  #  Scenario: Someone walks in to the kitchen and its dark
  #    Given there is movement is detected on the "Kitchen multisensor"
  #    And the "Kitchen multisensor" is reporting "user" - "Luminance" less than 20
  #    And the "Kitchen lights" is reporting "user" - "Level" less than 1
  #    Then the "Kitchen lights" user "Level" should be "30"

  Scenario: Remind Lounge lights to use bi stable switches
    Given the "Lounge lights" is reporting config "Inputs Button/Switch configuration" not "Bi-stable input (switch)"
    Then the "Lounge lights" config "Inputs Button/Switch configuration" should be "Bi-stable input (switch)"

  Scenario: Remind Lounge lights to use Follow switch contact
    Given the "Lounge lights" is reporting config "Inputs behaviour" not "Follow switch contact (closed=ON, open=OFF)"
    Then the "Lounge lights" config "Inputs behaviour" should be "Follow switch contact (closed=ON, open=OFF)"

  Scenario: Turn the lights off when the alarm is ready
    Given the alarm readiness changes to "ready"
    Then the "Entry lighting" user "Switch-1" should be off

  Scenario: Toggle the dining lights with the spare kitchen light
    When the "Kitchen lights" user "Sensor" changes
    Then the "Dining lights" user "Switch" should be toggled

  #lounge light switch
  Scenario: Button 1 is pushed on lounge light switch
    When the "Lounge light switch" button 1 is pushed
    Then the "Lounge lights" user "Switch-1" should be on
    Then the "Lounge lights" user "Switch" should be on

  Scenario: Button 5 is pushed on lounge light switch
    When the "Lounge light switch" button 5 is pushed
    Then the "Lounge lights" user "Switch-1" should be off
    Then the "Lounge lights" user "Switch" should be off

  Scenario: Button is pushed on bathroom light switch once
    When the "Family bathroom lights" button 26 is pushed
    Then the "Bathroom leds" led strip should be toggled

  # Garage lights controlled by lock
  Scenario: Locking garage turns lights off
    Given the "Garage door lock" is reporting user "Locked" "true"
    Then the "Garage lights" user "Switch" should be off

  Scenario: Unlocking garage turns lights on
    Given the "Garage door lock" is reporting user "Locked" not "true"
    Then the "Garage lights" user "Switch" should be on
