const express = require("express"); 
const crypto = require("crypto"); 
const fs = require("fs").promises; 
const fsSync = require("fs"); 
var Mutex = require("async-mutex").Mutex; 
const mutex = new Mutex(); 

const app = express(); 
const port = 8000; 
app.use(express.json()); 

var registrations = {}; 
try {
    const content = fsSync.readFileSync("registrations.json", {
        encoding: "utf8",
    }); 
    if (!content){
        registrations = {};
    } else {
        registrations = JSON.parse(content); 
    }
} catch (err){
    registrations = {}; 
}


app.post("/register/:name", async (req, res) => {
    const nameHash = crypto.createHash("sha256").update(req.params.name).digest("hex"); 
    if (req.params.name in registrations){
        res.status({
            hash: nameHash, 
            message: `${req.params.name} is already registered.`,
        }); 
    } else {
        registrations[req.params.name] = nameHash; 
        const release = await mutex.acquire(); 
        try {
            await fs.writeFile("registrations.json", JSON.stringify(registrations), "utf8");
        } catch (err) {
            console.error(err); 
        } finally {
            release(); 
        }
        res.status(200).json({
            hash: nameHash, 
            message: `${req.params.name} is now registered.`,
        }); 
    }
}); 

app.listen(port, () => {
    console.log(`Server started on port ${port}`); 
}); 

// The above implementation is stateful, as we not only keep the hashes in memory, but also write them to disk.

// However, for this use case, you do not need a stateful implementation to ensure consistent behavior.
// This is due to the chosen hashing algorithm (sha256), which is deterministic: that means for the same input, e.g.,
// "james", the hash will always be the same, even if your server burns and you replace it after 3 days.

// Hence, there is no need to actually store or cache hashes, but you can solely rely on a stateless implementation
// which will always just calculate the hash and respond with it.

// In certain cases, a stateful implementation can improve performance because you avoid re-doing certain calculations
// for the same input. However, this simple hashing operation is not a costly operation which would greatly benefit
// from caching.