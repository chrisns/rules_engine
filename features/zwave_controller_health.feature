Feature: Zwave ontroller status

  Scenario: EU Controller becomes ready
    When the zwave controller "Zwave eu controller" changes to ready
    Then a message reading "EU controller ready" is sent to "chris"

  Scenario: EU Controller becomes ready
    When the zwave controller "Zwave eu controller" changes to notready
    Then a message reading "EU controller not ready" is sent to "chris"

  Scenario: USA Controller becomes ready
    When the zwave controller "Zwave usa controller" changes to ready
    Then a message reading "US controller ready" is sent to "chris"

  Scenario: USA Controller becomes ready
    When the zwave controller "Zwave usa controller" changes to notready
    Then a message reading "US controller not ready" is sent to "chris"
