const Sim = require("pokemon-showdown");
stream = new Sim.BattleStream();

(async () => {
  for await (const output of stream) {
    console.log(output);
    if (output.slice(-7) === "|turn|1") {
      stream.write(`>p1 move 1`);
      stream.write(`>p2 move 2`);
    }
  }
})();

stream.write(`>start {"formatid":"gen8randombattle"}`);
stream.write(`>player p1 {"name":"Alice"}`);
stream.write(`>player p2 {"name":"Bob"}`);
