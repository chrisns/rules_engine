Feature: Lounge speaker volume

  Scenario: Daytime TV speaker
    Given a clock tic
    And the time is between "6am" and "6pm"
    Then the "Lounge" speaker nightmode should be off

  Scenario: Nighttime TV speaker
    Given a clock tic
    And the time is between "6pm" and "11pm"
    Then the "Lounge" speaker nightmode should be on

