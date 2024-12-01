function generateParser() {
  const grammarInput = document.getElementById("grammar").value.trim();
  if (!grammarInput) {
    alert("Please enter a grammar.");
    return;
  }

  try {
    // Parse the grammar into rules
    const rules = parseGrammar(grammarInput);

    // Calculate FIRST and FOLLOW sets
    const firstSet = calculateFirstSet(rules);
    const followSet = calculateFollowSet(rules, firstSet);

    // Create the Parsing Table
    const parsingTable = createParsingTable(rules, firstSet, followSet);

    // Display the results
    displayResults(firstSet, followSet, parsingTable);
  } catch (error) {
    alert(`An error occurred: ${error.message}`);
    console.error(error);
  }
}

function parseGrammar(grammar) {
  const rules = {};
  const lines = grammar.split("\n").map((line) => line.trim());

  lines.forEach((line, index) => {
    if (!line.includes("->")) {
      throw new Error(`Syntax error in grammar at line ${index + 1}: Missing '->'.`);
    }

    const [nonTerminal, productions] = line.split("->").map((s) => s.trim());
    if (!nonTerminal || !productions) {
      throw new Error(`Invalid rule at line ${index + 1}: Non-terminal or productions missing.`);
    }

    const prodArray = productions.split("|").map((prod) => prod.trim().split(/\s+/));
    rules[nonTerminal] = prodArray;
  });

  return rules;
}

function calculateFirstSet(rules) {
  const first = {};

  // Initialize FIRST sets for all non-terminals
  for (const nonTerminal in rules) {
    first[nonTerminal] = new Set();
  }

  let updated;
  do {
    updated = false;

    for (const nonTerminal in rules) {
      for (const production of rules[nonTerminal]) {
        let hasEpsilon = true;

        for (const symbol of production) {
          if (!rules[symbol]) { 
            // Terminal
            if (!first[nonTerminal].has(symbol)) {
              first[nonTerminal].add(symbol);
              updated = true;
            }
            hasEpsilon = false; // Terminal stops ε propagation
            break;
          } else {
            // Non-terminal
            const firstSymbol = first[symbol];
            for (const item of firstSymbol) {
              if (item !== "ε" && !first[nonTerminal].has(item)) {
                first[nonTerminal].add(item);
                updated = true;
              }
            }
            if (!firstSymbol.has("ε")) {
              hasEpsilon = false;
              break;
            }
          }
        }

        if (hasEpsilon && !first[nonTerminal].has("ε")) {
          first[nonTerminal].add("ε");
          updated = true;
        }
      }
    }
  } while (updated);

  return first;
}

function calculateFollowSet(rules, firstSet) {
  const follow = {};
  for (const nonTerminal in rules) {
    follow[nonTerminal] = new Set();
  }

  const startSymbol = Object.keys(rules)[0];
  follow[startSymbol].add("$");

  let updated;
  do {
    updated = false;

    for (const nonTerminal in rules) {
      for (const production of rules[nonTerminal]) {
        for (let i = 0; i < production.length; i++) {
          const symbol = production[i];

          if (rules[symbol]) {
            const rest = production.slice(i + 1);
            let hasEpsilon = true;

            for (const nextSymbol of rest) {
              if (!rules[nextSymbol]) {
                if (!follow[symbol].has(nextSymbol)) {
                  follow[symbol].add(nextSymbol);
                  updated = true;
                }
                hasEpsilon = false;
                break;
              } else {
                const firstNext = firstSet[nextSymbol];
                for (const item of firstNext) {
                  if (item !== "ε" && !follow[symbol].has(item)) {
                    follow[symbol].add(item);
                    updated = true;
                  }
                }
                hasEpsilon = firstNext.has("ε");
                if (!hasEpsilon) break;
              }
            }

            if (hasEpsilon) {
              for (const item of follow[nonTerminal]) {
                if (!follow[symbol].has(item)) {
                  follow[symbol].add(item);
                  updated = true;
                }
              }
            }
          }
        }
      }
    }
  } while (updated);

  return follow;
}

function createParsingTable(rules, firstSet, followSet) {
  const table = {};

  for (const nonTerminal in rules) {
    table[nonTerminal] = {};
  }

  for (const nonTerminal in rules) {
    for (const production of rules[nonTerminal]) {
      const first = new Set();
      let hasEpsilon = true;

      for (const symbol of production) {
        if (!rules[symbol]) {
          first.add(symbol);
          hasEpsilon = false;
          break;
        } else {
          const firstSymbol = firstSet[symbol];
          for (const item of firstSymbol) {
            if (item !== "ε") {
              first.add(item);
            }
          }
          if (!firstSymbol.has("ε")) {
            hasEpsilon = false;
            break;
          }
        }
      }

      if (hasEpsilon) {
        for (const item of followSet[nonTerminal]) {
          first.add(item);
        }
      }

      for (const terminal of first) {
        if (table[nonTerminal][terminal]) {
          throw new Error(`Conflict in parsing table at ${nonTerminal}, ${terminal}.`);
        }
        table[nonTerminal][terminal] = production.join(" ");
      }
    }
  }

  return table;
}

function displayResults(firstSet, followSet, parsingTable) {
  document.getElementById("output").style.display = "block";

  // Display FIRST Set
  const firstTable = document.getElementById("firstSetTable");
  firstTable.innerHTML = "<tr><th>Non-Terminal</th><th>FIRST Set</th></tr>";
  for (const nonTerminal in firstSet) {
    firstTable.innerHTML += `<tr><td>${nonTerminal}</td><td>${[...firstSet[nonTerminal]].join(", ")}</td></tr>`;
  }

  // Display FOLLOW Set
  const followTable = document.getElementById("followSetTable");
  followTable.innerHTML = "<tr><th>Non-Terminal</th><th>FOLLOW Set</th></tr>";
  for (const nonTerminal in followSet) {
    followTable.innerHTML += `<tr><td>${nonTerminal}</td><td>${[...followSet[nonTerminal]].join(", ")}</td></tr>`;
  }

  // Collect all terminals from FIRST and FOLLOW sets (excluding ε)
  let terminals = new Set();
  for (const nonTerminal in firstSet) {
    firstSet[nonTerminal].forEach(symbol => {
      if (symbol !== "ε") { // Exclude ε
        terminals.add(symbol);
      }
    });
  }
  for (const nonTerminal in followSet) {
    followSet[nonTerminal].forEach(symbol => {
      terminals.add(symbol);
    });
  }

  // Ensure $ is included as a terminal
  if (Object.values(followSet).some(set => set.has("$"))) {
    terminals.add("$");
  }

  // Convert the set of terminals to an array for consistent ordering
  terminals = [...terminals];

  // Display Parsing Table Header
  const parsingTableElement = document.getElementById("parsingTable");
  parsingTableElement.innerHTML = "<tr><th>Non-Terminal</th>" + terminals.map(terminal => `<th>${terminal}</th>`).join('') + "</tr>";

  // Display Parsing Table Rows
  for (const nonTerminal in parsingTable) {
    let row = `<tr><th>${nonTerminal}</th>`;
    terminals.forEach(terminal => {
      let production = parsingTable[nonTerminal][terminal] || "";

      // Handle ε: Check FOLLOW set if ε is in FIRST set
      if (firstSet[nonTerminal].has("ε")) {
        if (followSet[nonTerminal].has(terminal)) {
          production = parsingTable[nonTerminal]["ε"] || production;
        }
      }

      row += `<td>${production}</td>`;
    });
    row += "</tr>";
    parsingTableElement.innerHTML += row;
  }
}
