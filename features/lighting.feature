Feature: Lighting

  Scenario: Someone walks in to the kitchen and its dark
    Given there is movement is detected on the "Kitchen multisensor"
    And the "Kitchen multisensor" is reporting "user" - "Illuminance" less than 20
    And the "Kitchen lights" is reporting "user" - "Level" less than 25
    Then the "Kitchen lights" user "Level" should be "25"

  Scenario: Someone walks in to the kitchen
    Given there is movement is detected on the "Kitchen multisensor"
    Then the "Kitchen counter lights" user "Switch-1" should be on

  Scenario: Remind Lounge lights to use bi stable switches
    Given the "Lounge lights" is reporting config "Inputs Button/Switch configuration" not "Bi-stable input (switch)"
    Then the "Lounge lights" config "Inputs Button/Switch configuration" should be "Bi-stable input (switch)"

  Scenario: Remind Lounge lights to use Follow switch contact
    Given the "Lounge lights" is reporting config "Inputs behaviour" not "Follow switch contact (closed=ON, open=OFF)"
    Then the "Lounge lights" config "Inputs behaviour" should be "Follow switch contact (closed=ON, open=OFF)"

  Scenario: Turn the lights off when the alarm is ready
    Given the alarm readiness changes to "ready"
    Then the "Entry lighting" user "Switch-1" should be off

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

  Scenario: Movement in downstairs toilet clears
    Given there is no movement detected on the "Downstairs toilet multisensor"
    Then the "Downstairs toilet lighting" user "Level" should be "0"

  Scenario: Loft hatch opens
    Given the "Loft space hatch" is reporting user "Home Security" not "Clear"
    Then the "Loft space light" user "Switch" should be on

  Scenario: Loft hatch opens
    Given the "Loft space hatch" is reporting user "Home Security" "Clear"
    Then the "Loft space light" user "Switch" should be off

  Scenario: noah button push
    Given the "Nodeon remote" is reporting user "Scene 2" "Pressed 1 Time"
    Then the "Kitchen" speaker says "Noah paging"
    Then the "Loft" speaker whispers "Noah paging"
