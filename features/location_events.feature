Feature: Location based events

  Scenario: Announce Chris arrives
    Given cnsiphone arrives home
    When the alarm is not "Away"
    And the "Kitchen" speaker says "Daddy's home"

  Scenario: Announce Hannah arrives
    Given hnsiphone arrives home
    When the alarm is not "Away"
    And the "Kitchen" speaker says "Mummy's home"

  Scenario: Chris arrives home
    Given cnsiphone arrives home
    Then the "Entry lighting" user "Switch-1" should be on

  Scenario: Hannah arrives home
    Given hnsiphone arrives home
    Then the "Entry lighting" user "Switch-1" should be on