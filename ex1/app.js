import express from 'express'
import { v4 as uuidv4 } from 'uuid';

const Ajv = require("ajv"); 
const ajv = new Ajv({ useDefaults: true }); 

const app = express(); 
const port = 3000; 

const validate = Ajv.compile(schema); 

const schema = {
    type: "object", 
    properties: {
        id: {type: "string"}, 
        name: {type: "string"}, // minlength: 2, maxLength: 20
        race: { // he didnt write type 
            type: "string", 
            enum: ["human", "elf", "dwarf", "orc"]
        }, 
        intelligence: { 
            type: "integer", 
            minimum: 1, 
            maximum: 25, 
            default: 1
        }
    }, 
    required: ["id", "name", "race"], 
    additionalProperties: false
}; 

let characters = []

// Prof's code try/catch 
try {
    const content = fsSync.readFileSync("characters.json", {encoding: "utf8"}); 
    if (!content){
        characters = []; 
    } else {
        characters = JSON.parse(content); 
    }
} catch (err){
    // console.error(err); 
    characters = [];
}

// Prof's function: 
function getCharactersAsCSV(characters){
    // Typically, a .csv file will include a header (top/first) row describing each column's data.
    return [
        "name,race,intelligence",
        characters
        .map((character) => Object.values(character).join(","))
        .join("\n"),
    ].join("\n");
}



// In case an endpoint has a long list of possible status codes it can respond with,
// it can be useful to define human-readable names for each one, such that you (as the developer)
// don't lose track of what each status code is used for.
// To do so, just define an object with a key-value pairing. To ensure this object cannot be modified at all,
// use the Object.freeze method, which also prevents modifications to existing entries.
const GetCharacterResponseStatus = Object.freeze({
  found: 200,
  notFound: 404,
  random: 201,
  noCharacters: 202,
});



// This function is from 07a-REST-courses-express: 
function toCSV(obj) {
  const headers = Object.keys(obj);
  const row = Object.values(obj);
  const csv = [headers.join(','), row.join(',')].join('\n');
  return csv;
}

app.get('/characters', (req, res) => {
    // This built-in "accepts" method helps you verify that the client's request indicates
    // a supported response format, based on your server's accepted formats.
    // Alternatively, you can manually check the client's specified response format
    // by accessing req.headers["Accept"].
    const preferredType = req.accepts(['json', 'csv']) 
    if (preferredType){
        for (const character of characters){
            if (preferredType === 'csv'){
                res.contentType('text/csv').send(toCSV(character)); // status 200
            } else{
                res.json(character); // status 200 
            }
        }
    } else {
        res.sendStatus(406); 
    }
});

// he combined these next two with one '/character/:id?' 
app.get('/character', (req, res) => {
    // he included the case where there was no character with corresponding id 
    // or multiple characters with the id 
    const preferredType = req.accepts(['json', 'csv']) 
    if (preferredType){
        const randomCharacter = characters[Math.floor(characters.length * Math.random())];  
        if (preferredType === 'csv'){
            res.contentType('text/csv').send(toCSV(randomCharacter)); 
        } else{
            res.json(randomCharacter); 
        }
    } else {
        res.sendStatus(406); 
    }
}); 

app.get('/character/:id', (req, res) => {
    for (const character of characters){
        if (character.id === req.params.id) {
            const preferredType = req.accepts(['json', 'csv']) 
            if (preferredType){
                if (preferredType === 'csv'){
                    res.contentType('text/csv').send(toCSV(randomCharacter)); 
                } else{
                    res.json(randomCharacter); 
                }
            } else {
                res.sendStatus(406); 
            }
            return; 
        }
    }
    res.status(404).send(`character '${req.params.id}' not found`); 
})

// Prof's get (combines last two gets i made)
app.get("/character/:id?", (req, res) => {
  if (req.params.id) {
    const character = characters.find(
      (element) => element.id === req.params.id
    );
    if (!character) {
      res
        .status(GetCharacterResponseStatus.notFound)
        .send(`Character with the id '${req.params.id}' does not exist.`);
    } else {
      res.status(GetCharacterResponseStatus.found).json(character);
    }
  } else if (characters.length > 0) {
    const randomCharacter = characters[Math.floor(Math.random() * characters.length)];
    res.status(GetCharacterResponseStatus.random).json(randomCharacter);
  } else {
    res
      .status(GetCharacterResponseStatus.noCharacters)
      .send(`No characters available.`);
  }
});


app.post('/character', async (req, res) => { // he added async
    // prof compares directly with body 
    const idNum = uuidv4(); 
    const newCharacter = {
        id: idNum, 
        name: req.body.name, 
        race: req.body.race, 
        intelligence: req.body.intelligence ?? 1
    }
    try {
        if (!validate(newCharacter)){
            return res.sendStatus(404)
        } else {
            characters.push(newCharacter); 
            return res.status(200).send(`Character created! ID: ${idNum}`); 
        }
    } catch {
        res.sendStatus(500);
    }
    // prof wrote directly to disk by writing to file 
});


// prof's version: 
app.post("/character", async (req, res) => {
  req.body["id"] = uuidv4();
  if (ajv.validate(characterSchema, req.body)) {
    // The basic fs module approach without any locking mechanism.
    // characters.push(req.body);
    // fsSync.writeFileSync("characters.json", JSON.stringify(characters), "utf8");
    // res.status(200).json({ id: req.body["id"], message: `Character saved.` });
    // Using manual locking to avoid race conditions:
    const release = await mutex.acquire();
    try {
      // fsSync.writeFileSync("characters.json", JSON.stringify(characters), "utf8");
      // res.status(200).json({ id: req.body["id"], message: `Character saved.` });
      characters.push(req.body);
      await fs.writeFile("characters.json", JSON.stringify(characters), "utf8");
      res.status(200).json({ id: req.body["id"], message: `Character saved.` });
    } catch (err) {
      res
        .status(500)
        .send("Character cannot be saved: a server error occurred.");
    } finally {
      // It is important that you always release your manual lock.
      // To ensure this, you typically use a "try {} finally {}" statement
      // such that the release is always executed, even in case of errors.
      release();
    }
  } else {
    res.status(404).send("Character cannot be saved: invalid schema.");
  }
});

app.listen(port, () => {
    console.log(`App listening on port ${port}`)
});
