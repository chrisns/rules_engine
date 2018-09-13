Feature: Location based events

  Scenario: Chris leaves but does not set the alarm
    Given cnsiphone leaves home
    When the alarm is "Disarm"
    Then a message reading "You left but did not set the alarm" is sent to "Chris"

  Scenario: Hannah leaves but does not set the alarm
    Given hnsiphone leaves home
    When the alarm is "Disarm"
    Then a message reading "You left but did not set the alarm" is sent to "Hannah"

  Scenario: Announce Chris arrives
    Given cnsiphone arrives home
    When the alarm is not "Away"
    Then the "Desk" speaker says "Daddy's home"
    And the "Kitchen" speaker says "Daddy's home"

  Scenario: Announce Hannah arrives
    Given hnsiphone arrives home
    When the alarm is not "Away"
    Then the "Kitchen" speaker says "Mummy's home"
    And the "Kitchen" speaker says "Daddy's home"

  Scenario: Chris arrives disarm alarm
    Given cnsiphone arrives home
    When the alarm is not "Disarm"
    And the alarm state should be "Disarm"

  Scenario: Hannah arrives disarm alarm
    Given hnsiphone arrives home
    When the alarm is not "Disarm"
    And the alarm state should be "Disarm"

  Scenario: Chris arrives unlock door
    Given cnsiphone arrives home
    Then the front door is unlocked

  Scenario: Hannah arrives unlock door
    Given hnsiphone arrives home
    Then the front door is unlocked

  Scenario: Chris arrives home after dark
    Given cnsiphone arrives home
    And the current time is after sunset
    Then the "Entry lights" user "Switch" should be on
    Then the "Entry lights" user "Switch-1" should be on
    Then a delay of 15 minutes
    Then the "Entry lights" user "Switch-1" should be off

  Scenario: Hannah arrives home after dark
    Given cnsiphone arrives home
    And the current time is after sunset
    Then the "Entry lights" user "Switch" should be on
    Then the "Entry lights" user "Switch-1" should be on
    Then a delay of 15 minutes
    Then the "Entry lights" user "Switch-1" should be off