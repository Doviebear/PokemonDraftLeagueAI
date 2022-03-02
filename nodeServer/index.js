import { Dex } from "@pkmn/dex";
import { Generations } from "@pkmn/data";
import { Smogon } from "@pkmn/smogon";
import fetch from "node-fetch";
import { createRequire } from "module";
import { waitForDebugger } from "inspector";
import { SSL_OP_EPHEMERAL_RSA } from "constants";
const require = createRequire(import.meta.url);

const express = require("express");
var bodyParser = require("body-parser");
const fs = require("fs");
const app = express();
const port = 3000;
var jsonParser = bodyParser.json();

const EventEmitter = require("events");

class MyEmitter extends EventEmitter {}
const completionEmitter = new MyEmitter();

const gens = new Generations(Dex);
const smogon = new Smogon(fetch);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/getBestSix", jsonParser, async (req, res) => {
  //var name = req.query.id;
  var friendTeam = req.body.friendTeam;
  var enemyTeam = req.body.enemyTeam;
  var resultsTable = {};
  /* RESULTS TABLE FORMAT
  
    "Serperior":  {
      set: {enemyPokemon1: {set1: 5.0, set2: 7.0}, enemyPokemon2: {set1: 5.0, set2: 7.0}, ...}},
      set: {set1: 5.0, set2: 7.0}, enemyPokemon2: {set1: 5.0, set2: 7.0}, ...}}
    }
    ...
  
  */
  var battleCount = 0;
  var totalNumFriendlySets = 0;
  var totalNumEnemySets = 0;

  var enemyPokemonData = {};
  for (const enemyPokemon of enemyTeam) {
    let setsOfPokemon = await getSets(enemyPokemon);
    enemyPokemonData[enemyPokemon] = setsOfPokemon;
    totalNumEnemySets += setsOfPokemon.length;
    //console.log(`${enemyPokemon} Sets are: `);
    //console.log(setsOfPokemon);
  }
  console.log("enemyPokemonData is now: ");
  console.log(enemyPokemonData);
  // Loop through teams to make pokemon pairs

  var friendlySetsArr = [];

  for (var i = 0; i < friendTeam.length; i++) {
    resultsTable[friendTeam[i]] = {};
    var setsArr = await getSets(friendTeam[i]);
    setsArr.forEach((set) => {
      let key = JSON.stringify(set);
      resultsTable[friendTeam[i]][key] = {};
      friendlySetsArr.push(set);
      totalNumFriendlySets += 1;
    });
  }

  console.log("FriendlySetsArr is: ");
  console.log(friendlySetsArr);

  //console.log(`Data table for ${friendTeam[i]} created`);
  //console.log(`${friendTeam[i]} Sets are: `);
  //console.log(setsArr);
  //console.log("right before loop data is: ");
  //console.log(enemyPokemonData);

  var totalNumBattles = totalNumEnemySets * totalNumFriendlySets;
  console.log(`Total Number of Battles to be Created: ${totalNumBattles}`);
  for (const enemyPokemon of enemyTeam) {
    for (const enemySet of enemyPokemonData[enemyPokemon]) {
      for (const set of friendlySetsArr) {
        var configs = getConfigsForBattle(set, enemySet, battleCount);
        var friendlyInfo = {
          ID: "friendly",
          setID: getSetIdentify(set),
          enemySetID: getSetIdentify(enemySet),
          mySet: set,
          enemySet: enemySet,
          totalNumBattlesExpected: totalNumBattles,
          friendlyTeam: friendTeam,
        };
        var enemyInfo = {
          ID: "enemy",
          setID: getSetIdentify(enemySet),
          enemySetID: getSetIdentify(set),
          mySet: enemySet,
          enemySet: set,
          totalNumBattlesExpected: totalNumBattles,
          friendlyTeam: friendTeam,
        };
        battleCount += 1;
        //console.log("configs are: ");
        //console.log(configs);
        runBattleBot(configs[0], resultsTable, friendlyInfo);
        runBattleBot(configs[1], resultsTable, enemyInfo);
        console.log(
          `Running Battle #${battleCount}, set1: ${set.species},${set.name} vs set2: ${enemySet.species}, ${enemySet.name}`
        );
        await sleep(50);
      }
    }
  }

  completionEmitter.on("done", () => {
    console.log("ResultsTabel is Done!");
    res.send(resultsTable);
  });

  //res.send(`Hello my dears`);
});

app.get("/getTestSet", (req, res) => {
  //getResString().then((value) => res.send(value));
  getSets("Mamoswine").then((value) => res.send(value));
  //console.log(getSets("Heatran"));
});

app.get("/pythonTestScript", (req, res) => {
  let var1 = 4;
  let var2 = 18;
  console.log("spawning test Python Script");
  var childProcess = require("child_process").spawn(
    "python",
    ["./testScript.py", "./testJson.json"],
    { stdio: "inherit" }
  );
  childProcess.on("data", function (data) {
    process.stdout.write("python script output", data);
  });
  childProcess.on("close", function (code) {
    if (code === 1) {
      process.stderr.write("error occured", code);
      process.exit(1);
    } else {
      process.stdout.write('"python script exist with code: ' + code + "\n");
      res.send("Done");
    }
  });

  /*
  const spawn = require("child_process").spawn;
  const pythonProcess = spawn("python", ["./testScript.py", "./testJson.json"]);

  pythonProcess.stdout.on("data", function (data) {
    console.log("Test Data Received, piping to client");
    dataToSend = data.toString();
    res.send(dataToSend);
  });
  */
});

app.get("/testBattleBot", (req, res) => {
  console.log("starting battle bot");

  var battleConfigs1 = {
    WEBSOCKET_URI: "localhost:8080",
    PS_USERNAME: "asadrivenleaf2",
    BOT_MODE: "ACCEPT_CHALLENGE",
    POKEMON_MODE: "gen8nationaldex",
    RUN_COUNT: "1",
    TEAM_NAME:
      "clefable||lifeorb|magicguard|moonblast,thunderbolt,flamethrower,moonlight|modest|76,,,252,,180|||||,,",
  };
  runBattleBot(battleConfigs1);
});

app.get("/testDoubleBattleBot", (req, res) => {
  var set1 = {
    name: "Substitute Attacker",
    species: "Serperior",
    item: "Leftovers",
    ability: "Contrary",
    moves: ["Leaf Storm", "Hidden Power Fire", "Substitute", "Glare"],
    nature: "Timid",
    evs: {
      hp: 56,
      spa: 200,
      spe: 252,
    },
    gigantamax: false,
    hpType: "Fire",
  };

  var set2 = {
    name: "Wallbreaker",
    species: "Mamoswine",
    item: "Life Orb",
    ability: "Thick Fat",
    moves: ["Icicle Crash", "Earthquake", "Ice Shard", "Knock Off"],
    nature: "Adamant",
    evs: {
      atk: 252,
      spd: 4,
      spe: 252,
    },
    gigantamax: false,
  };

  console.log("starting Both Battle Bots");
  var battleConfigs1 = {
    WEBSOCKET_URI: "localhost:8080",
    PS_USERNAME: "asadrivenleaf2",
    BOT_MODE: "ACCEPT_CHALLENGE",
    POKEMON_MODE: "gen8nationaldex",
    RUN_COUNT: "1",
    TEAM_NAME: getTeamStringFromSet(set1),
  };
  var battleConfigs2 = {
    WEBSOCKET_URI: "localhost:8080",
    PS_USERNAME: "asadrivenleaf",
    BOT_MODE: "CHALLENGE_USER",
    POKEMON_MODE: "gen8nationaldex",
    RUN_COUNT: "1",
    USER_TO_CHALLENGE: "asadrivenleaf2",
    TEAM_NAME: getTeamStringFromSet(set2),
  };
  runBattleBot(battleConfigs1);
  runBattleBot(battleConfigs2);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

function runBattleBot(configs, resultsTable = {}, info = null) {
  var currentTurnNum = 0;
  var currentHP = 1.0;
  var isWinner = false;
  var cmd = JSON.stringify(configs);
  var inGamePlayerID = 1;

  var childProcess = require("child_process").spawn(
    "python3",
    ["../showdown/run.py", cmd]
    //{ stdio: "inherit" }
  );

  childProcess.stdout.on("data", function (data) {
    //console.log(`Data is from ${configs.PS_USERNAME}`);
    //process.stdout.write(data);
    let dataString = data.toString();
    let playerIDIndex = dataString.indexOf("|player");
    if (playerIDIndex != -1) {
      var playerIDString = dataString.substring(playerIDIndex);
      var arrOfPlayerIDString = playerIDString.split("|");
      //console.log("Arr of Player ID is: ");
      //console.log(arrOfPlayerIDString);
      var index = arrOfPlayerIDString.indexOf(configs.PS_USERNAME);
      if (index != -1) {
        inGamePlayerID = arrOfPlayerIDString[index - 1].slice(-1);
        //console.log(`Updated player ID, is now: ${inGamePlayerID}`);
      }
    }
    let turnStringIndex = dataString.indexOf("|turn");
    if (turnStringIndex != -1) {
      currentTurnNum = currentTurnNum + 1;
      //console.log("Current Turn updated, now " + currentTurnNum);
    }

    let myDamageIndex = dataString.indexOf(`|-damage|p${inGamePlayerID}a:`);
    if (myDamageIndex != -1) {
      var damageString = dataString.substring(myDamageIndex);
      var arrOfDamageString = damageString.split("|");
      //console.log("Arr of Damage is ");
      //console.log(arrOfDamageString);
      var HPString = arrOfDamageString[3].replace(/[^0-9\/]+/g, "");
      //console.log(`HPString is: ${HPString}`);
      if (HPString === "0") {
        currentHP = 0;
      } else {
        var HPArr = HPString.split("/");
        let percentHP = parseFloat(HPArr[0]) / parseFloat(HPArr[1]);
        currentHP = percentHP;
      }
      //console.log("Updated Current HP, now " + currentHP);
    }

    let winnerStringIndex = dataString.indexOf("W:");
    if (winnerStringIndex != -1) {
      if (
        dataString.substring(winnerStringIndex + 3, winnerStringIndex + 4) == 1
      ) {
        isWinner = true;
      }
    }

    //console.log("End of Data Chunk");
  });

  childProcess.on("close", function (code) {
    if (code === 1) {
      process.stderr.write("error occured", code);
      process.exit(1);
    } else {
      process.stdout.write('"python script exits with code: ' + code + "\n");
      console.log(
        `Battle Finished with User: ${configs.PS_USERNAME}, Turns: ${currentTurnNum}, HP: ${currentHP}, Won:${isWinner}, PlayerID: ${inGamePlayerID}`
      );
      if (info !== null) {
        if (isWinner) {
          var results = getScoreForBattleBotMatchup(
            currentTurnNum,
            currentHP,
            info
          );
          addToResultsTable(results, resultsTable, info);
        }
      }
    }
  });
}

const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

function getSetIdentify(set) {
  var offensiveEVS = set.evs.atk ?? 0 + set.evs.spa ?? 0 + set.evs.spe ?? 0;
  var defensiveEVS = set.evs.def ?? 0 + set.evs.spd ?? 0 + set.evs.hp ?? 0;

  if (offensiveEVS > defensiveEVS) {
    return "offensive";
  } else {
    return "defensive";
  }
}

function addToResultsTable(results, resultsTable, info) {
  if (info.ID === "friendly") {
    let name = info.mySet.species;
    let set = JSON.stringify(info.mySet);
    let enemySet = JSON.stringify(info.enemySet);
    resultsTable[name][set][enemySet] = results;
  } else {
    let name = info.enemySet.species;
    let set = JSON.stringify(info.enemySet);
    let mySet = JSON.stringify(info.mySet);
    resultsTable[name][set][mySet] = results;
  }
  checkIfResultsTableIsComplete(resultsTable, info);
  //console.log(JSON.stringify(resultsTable));
}

function checkIfResultsTableIsComplete(resultsTable, info) {
  //add all the lengths of the sets arrays, then get all the sets of the other pokemon, multiply together and see if it matches the total num of results

  var numEnemySetsInTable = 0;
  for (var i = 0; i < info["friendlyTeam"].length; i++) {
    var friendPokemon = info["friendlyTeam"][i];
    var friendlySets = Object.keys(resultsTable[friendPokemon]);

    for (const friendlySet of friendlySets) {
      numEnemySetsInTable += Object.keys(
        resultsTable[friendPokemon][friendlySet]
      ).length;
    }
  }
  const totalMatchupsInTable = numEnemySetsInTable;
  console.log(`Total Num Matchups in Results Table: ${totalMatchupsInTable}`);

  if (totalMatchupsInTable === info.totalNumBattlesExpected) {
    console.log("We're done! All Matchups gotten");
    completionEmitter.emit("done");
  }
}

function getScoreForBattleBotMatchup(numTurns, currentHP, setInfo) {
  var enemyModifer = 1;
  if (setInfo.ID === "enemy") {
    enemyModifer = -1;
  }
  if (setInfo.setID === "offensive" && setInfo.enemySetID === "offensive") {
    return clamp(enemyModifer * (10 - ((1 - currentHP) * 10) / 2), -10, 10);
  } else if (
    setInfo.setID === "offensive" &&
    setInfo.enemySetID === "defensive"
  ) {
    return clamp(
      enemyModifer * (((1 - currentHP) * 10) / 2) - numTurns - 2,
      -10,
      10
    );
  } else if (
    setInfo.setID === "defensive" &&
    setInfo.enemySetID === "offensive"
  ) {
    return clamp(enemyModifer * (10 - ((1 - currentHP) * 10) / 5) - 10, 10);
  } else {
    return enemyModifer * clamp(10 - numTurns, 0, 10);
  }
}

function getResultsForSetBattle(set1, set2) {}

function getConfigsForBattle(set1, set2, battleCount) {
  var battleConfigs1 = {
    WEBSOCKET_URI: "localhost:8080",
    PS_USERNAME: `asadrivenleaf${battleCount}1`,
    BOT_MODE: "CHALLENGE_USER",
    POKEMON_MODE: "gen8nationaldex",
    RUN_COUNT: "1",
    USER_TO_CHALLENGE: `asadrivenleaf${battleCount}2`,
    TEAM_NAME: getTeamStringFromSet(set1),
  };

  var battleConfigs2 = {
    WEBSOCKET_URI: "localhost:8080",
    PS_USERNAME: `asadrivenleaf${battleCount}2`,
    BOT_MODE: "ACCEPT_CHALLENGE",
    POKEMON_MODE: "gen8nationaldex",
    RUN_COUNT: "1",
    TEAM_NAME: getTeamStringFromSet(set2),
  };

  return [battleConfigs1, battleConfigs2];
}

function getTeamStringFromSet(set) {
  //"clefable||lifeorb|magicguard|moonblast,thunderbolt,flamethrower,moonlight|modest|76,,,252,,180|||||,,
  var movesString = "";
  for (const move of set.moves) {
    movesString += `${move.replace(/\s/g, "").toLowerCase()},`;
  }
  movesString = movesString.slice(0, -1);
  return `${set.species.toLowerCase()}||${set.item
    .replace(/\s/g, "")
    .toLowerCase()}|${set.ability
    .replace(/\s/g, "")
    .toLowerCase()}|${movesString}|${set.nature.toLowerCase()}|${
    set.evs.hp ?? ""
  },${set.evs.atk ?? ""},${set.evs.def ?? ""},${set.evs.spa ?? ""},${
    set.evs.spd ?? ""
  },${set.evs.spe ?? ""}|||||,,`;
}

async function getSets(pokemon) {
  const tiers = ["ou", "uu", "ru", "nu", "pu"];
  var setArr = [];
  var genToStart = 8;
  while (setArr.length === 0) {
    for (const tier of tiers) {
      var formatString = `gen${genToStart}` + tier;
      var resultArr = await smogon.sets(
        gens.get(genToStart),
        pokemon,
        formatString
      );
      //console.log(resultArr);
      if (resultArr.length !== 0) {
        for (var i = 0; i < resultArr.length; i++) {
          setArr.push(resultArr[i]);
        }
      }
    }
    genToStart = genToStart - 1;
  }
  return setArr;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
