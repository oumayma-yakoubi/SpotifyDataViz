// ----------------- DATA LOADING PART -------------------

async function loadJSON(filePath){
    const response = await fetch(filePath);
    if(!response.ok) throw new Error(`Could not fetch ${filePath} : ${response.statusText}`);
    return await response.json();
}

async function getUserFileList() {
    const response = await fetch('https://raw.githubusercontent.com/oumayma-yakoubi/SpotifyDataViz/refs/heads/main/index.json');
    return await response.json();
}

async function loadUserData(userFolder, files) {
    const basePath = `https://raw.githubusercontent.com/oumayma-yakoubi/SpotifyDataViz/refs/heads/main/data/${userFolder}`;
    const userData = {user: userFolder, playlists: [], streamingHistory: {music: [], podcast: []} };

    for (const file of files){
        if (file.startsWith('StreamingHistory_music')){
            const musicData = await loadJSON(`${basePath}/${file}`);
            userData.streamingHistory.music.push(...musicData);
        }
        else if(file.startsWith('StreamingHistory_podcast')){
            const podcastData = await loadJSON(`${basePath}/${file}`);  
            userData.streamingHistory.podcast.push(...podcastData);
        }
        else if(file.startsWith('Playlist')){
            const playlistData = await loadJSON(`${basePath}/${file}`);
            userData.playlists.push(...playlistData.playlists);
        } else{
            const fileKey = file.replace('.json', '');
            userData[fileKey] = await loadJSON(`${basePath}/${file}`);
        }
    }
    return userData;
}

async function loadAllUsersData() {
    const fileList = await getUserFileList();
    const allData = [];

    for (const [userFolder, files] of Object.entries(fileList)){
        const userData = await loadUserData(userFolder, files);
        allData.push(userData);
    }

    return allData;
}

// ----------------- VISUALIZATION FUNCTIONS -------------------

// Slot 1: Visualize the playlists data
async function visualizePlaylists(userData){
    const playlistData = userData.playlists.map((playlist, index) => {
        const name = playlist.name || "Untitled Playlist";
        const itemCount = Array.isArray(playlist.items) ? playlist.items.length : 0;
        return { name: name, count: itemCount };
    });

    const width = 500;
    const height = 300; 
    const margin = {top: 20, right: 20, bottom: 50, left: 50};

    const svg = d3.select("#playlist-chart")
                  .append("svg")
                  .attr("width", width)
                  .attr("height", height);

    const xScale = d3.scaleBand()
                     .domain(playlistData.map(d=>d.name))
                     .range([margin.left, width - margin.right])
                     .padding(0.2);
   
    const yScale = d3.scaleLinear()
                     .domain([0, d3.max(playlistData, d => d.count)])
                     .range([height - margin.bottom, margin.top]);

    const xAxis = svg.append("g")
                     .attr("transform", `translate(0, ${height - margin.bottom})`)
                     .call(d3.axisBottom(xScale));
    
    xAxis.selectAll("text")
         .style("text-anchor", "end") // Anchor at the end for vertical alignment
         .attr("transform", "rotate(-90)") // Rotate by 90 degrees counterclockwise
         .attr("x", -10) // Adjust horizontal position
         .attr("y", 0) // Adjust vertical position
         .attr("dy", "0.35em"); // Fine-tune vertical alignment
                
    svg.append("g")
       .attr("transform", `translate(${margin.left}, 0)`)
       .call(d3.axisLeft(yScale));

    const tooltip = d3.select("#tooltip");

    svg.selectAll(".bar")
       .data(playlistData)
       .enter()
       .append("rect")
       .attr("class", "bar")
       .attr("x", d => xScale(d.name))
       .attr("y", d => yScale(d.count))
       .attr("width", xScale.bandwidth())
       .attr("height", d => height - margin.bottom - yScale(d.count))
       .attr("fill", "steelblue")
       .on("mouseover", (event, d) => {
           tooltip.style("opacity", 1)
                  .html(`Playlist: ${d.name}<br>Items: ${d.count}`);
       })
       .on("mousemove", (event) => {
           tooltip.style("left", (event.pageX + 10) + "px")
                  .style("top", (event.pageY - 20) + "px");
       })
       .on("mouseout", () => {
           tooltip.style("opacity", 0);
       });
       
}

// Slot 2: Visualize the total listening time per month (Line chart)
async function visualizeMonthlyListening(userData) {
    const musicData = userData.streamingHistory.music;
    if (!musicData || musicData.length === 0) {
        console.error("No music data available for visualization.");
        return;
    }

    const monthlyMinutes = {};
    musicData.forEach(record => {
        const date = new Date(record.endTime);
        const month = date.toLocaleString('default', { month: 'short'});
        const minutes = record.msPlayed / 60000;  // Convert ms to minutes

        if (monthlyMinutes[month]) {
            monthlyMinutes[month] += minutes;
        } else {
            monthlyMinutes[month] = minutes;
        }
    });

    const months = Object.keys(monthlyMinutes);
    const minutes = Object.values(monthlyMinutes);

    const width = 500;
    const height = 300;
    const margin = {top: 20, right: 20, bottom: 50, left: 50};

    const svg = d3.select("#listeningTimelineChart")
                  .append("svg")
                  .attr("width", width)
                  .attr("height", height);

    const xScale = d3.scalePoint()
                     .domain(months)
                     .range([margin.left, width - margin.right])
                     .padding(0.5);

    const yScale = d3.scaleLinear()
                     .domain([0, d3.max(minutes)])
                     .nice()
                     .range([height - margin.bottom, margin.top]);

    svg.append("g")
       .attr("transform", `translate(0, ${height - margin.bottom})`)
       .call(d3.axisBottom(xScale));

    svg.append("g")
       .attr("transform", `translate(${margin.left}, 0)`)
       .call(d3.axisLeft(yScale));

    const line = d3.line()
                   .x((d, i) => xScale(months[i]))
                   .y(d => yScale(d));

    svg.append("path")
       .data([minutes])
       .attr("fill", "none")
       .attr("stroke", "steelblue")
       .attr("stroke-width", 2)
       .attr("d", line);

    const tooltip = d3.select("#tooltip");

    svg.selectAll("circle")
       .data(minutes)
       .enter()
       .append("circle")
       .attr("cx", (d, i) => xScale(months[i]))
       .attr("cy", d => yScale(d))
       .attr("r", 5)
       .attr("fill", "red")
       .on("mouseover", (event, d) => {
            tooltip.style("opacity", 1)
                    .html(`Month: ${months[minutes.indexOf(d)]}<br>Minutes: ${d.toFixed(2)}`);
        })
        .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", () => {
            tooltip.style("opacity", 0);
        });
}


async function visualizeTopSearchQueries(userData) {
  
    // Extract the search queries from the user data
    const searchQueries = userData.SearchQueries;

    // Count the frequency of each search term
    const searchCount = {};

    searchQueries.forEach(entry => {
        const term = entry.searchQuery.trim().toLowerCase(); // Normalize the search term
        if (term) {
            searchCount[term] = (searchCount[term] || 0) + 1;
        }
    });

    // Convert the searchCount object to an array of {term, count} pairs
    const searchData = Object.entries(searchCount)
                             .map(([term, count]) => ({ term, count }))
                             .sort((a, b) => b.count - a.count);  // Sort by count in descending order

    // Get the top 15 most frequent search terms
    const topSearchData = searchData.slice(0, 15);

    // Set up the dimensions for the bar chart
    const width = 500;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 50, left: 50 };

    // Create the SVG element for the bar chart
    const svg = d3.select("#top15Searches")
                  .append("svg")
                  .attr("width", width)
                  .attr("height", height);

    // Set up the x and y scales
    const xScale = d3.scaleBand()
                     .domain(topSearchData.map(d => d.term))
                     .range([margin.left, width - margin.right])
                     .padding(0.2);

    const yScale = d3.scaleLinear()
                     .domain([0, d3.max(topSearchData, d => d.count)])
                     .nice()  // Adjust the range for better fit
                     .range([height - margin.bottom, margin.top]);

    // Append the x and y axes
    svg.append("g")
       .attr("transform", `translate(0, ${height - margin.bottom})`)
       .call(d3.axisBottom(xScale))
       .selectAll("text")
       .attr("transform", "rotate(-45)")
       .attr("x", -10) // Adjust horizontal position
       .style("text-anchor", "end");  // Rotate x-axis labels for readability

    svg.append("g")
       .attr("transform", `translate(${margin.left}, 0)`)
       .call(d3.axisLeft(yScale));

    // Create the bars for the bar chart
    const tooltip = d3.select("#tooltip");

    svg.selectAll(".bar")
       .data(topSearchData)
       .enter()
       .append("rect")
       .attr("class", "bar")
       .attr("x", d => xScale(d.term))
       .attr("y", d => yScale(d.count))
       .attr("width", xScale.bandwidth())
       .attr("height", d => height - margin.bottom - yScale(d.count))
       .attr("fill", "steelblue")
       .on("mouseover", (event, d) => {
        tooltip.style("opacity", 1)
               .html(`Search Term: ${d.term}<br>Count: ${d.count}`);
        })
        .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", () => {
            tooltip.style("opacity", 0);
        });
}




// ----------------- USER SELECTION AND EVENT HANDLING -------------------

async function populateUserSelect() {
    const allData = await loadAllUsersData();
    const userSelect = document.getElementById("user-select");

    allData.forEach((user, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = user.user;
        userSelect.appendChild(option);
    });
}

async function onUserSelect(event) {
=======
// Function to load genre data
async function loadGenreData(userFolder) {
    const genreFilePath = `https://raw.githubusercontent.com/oumayma-yakoubi/SpotifyDataViz/refs/heads/main/data/genre/artistGenres_${userFolder}.json`;
    try {
        const genreData = await loadJSON(genreFilePath);
        return genreData;
    } catch (error) {
        console.error(`Error loading genre data for ${userFolder}:`, error);
        return {};  // Return empty object if there was an error
    }
}

// ***************************************************
// ********* fetch the genre for each artist *********
// ***************************************************

// Function to get Spotify access token
async function getSpotifyAccessToken(clientId, clientSecret) {
    const tokenUrl = "https://accounts.spotify.com/api/token";
    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");

    const authString = btoa(`${clientId}:${clientSecret}`);

    const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
            Authorization: `Basic ${authString}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
    });

    const data = await response.json();
    return data.access_token;
}


// Function to extract unique artists
function extractUniqueArtists(streamingHistory) {
    const artistSet = new Set();

    streamingHistory.forEach(track => {
        artistSet.add(track.artistName); // Adjust based on JSON structure
    });

    return Array.from(artistSet); // Convert to array
}


// Helper to divide array into chunks
function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}


// Function to fetch artist data from Spotify API with rate-limiting handling
async function fetchArtistsBatchWithGlobalRateLimit(artistNames, accessToken) {
    const batches = chunkArray(artistNames, 10); // Split into batches of 10
    let allArtistData = [];

    for (const batch of batches) {
        const query = batch.map(name => encodeURIComponent(name)).join(",");
        const url = `https://api.spotify.com/v1/search?q=${query}&type=artist&limit=10`; // 10 artists per batch

        let attempt = 0;
        const maxRetries = 5;

        while (attempt < maxRetries) {
            try {
                const response = await fetch(url, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });

                if (response.status === 429) {
                    const retryAfter = parseInt(response.headers.get("Retry-After")) || 1;
                    console.warn(`Rate limited. Retrying after ${retryAfter} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                    attempt++;
                    continue;
                }

                if (!response.ok) throw new Error(`Error fetching batch: ${response.statusText}`);
                const data = await response.json();
                allArtistData = allArtistData.concat(data.artists.items.map(artist => ({
                    name: artist.name,
                    genres: artist.genres,
                })));
                break; // Successfully fetched, exit the retry loop
            } catch (error) {
                console.error(`Attempt ${attempt + 1} failed: ${error.message}`);
                attempt++;
                const backoffDelay = Math.pow(2, attempt) * 1000; // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
            }
        }
    }

    return allArtistData;
}




async function init() {
    const clientId = "2b0cb231ed154e9eb7688620fc9aad55"; 
    const clientSecret = "42e1045384db43a798a64e68608071a5"; 

    // Load all users' data

  const allData = await loadAllUsersData();
    const selectedIndex = event.target.value;

    if (selectedIndex !== "") {
        const user = allData[selectedIndex];

        // Clear and add new visualizations for each chart slot
        document.getElementById("topArtistChart").innerHTML = ""; // Clear the first slot
        document.getElementById("playlist-chart").innerHTML = ""; // Clear the second slot
        document.getElementById("top15Searches").innerHTML = ""; // Clear the third slot
        document.getElementById("listeningTimelineChart").innerHTML = ""; // Clear the fourth slot
        document.getElementById("popularityBubbleChart").innerHTML = ""; // Clear the fifth slot

        // Add new visualizations
        await visualizePlaylists(user);         // Visualize playlists in the second slot
        await visualizeMonthlyListening(user);  // Visualize listening time in the third slot
        await visualizeTopSearchQueries(user);


    for (const userData of allData) {
                        
        try {
            // Change this to false if you want to fetch the artist genre (if it's not done yet)
            const genreDataExists = true;

            // Check if the genre data file already exists in the genre repository            
            if (genreDataExists) {
                console.log(`Genre data already exists for user: ${userData.user}. Skipping fetch.`);
                continue; // Skip the whole process if genre data file exists
            }

            const uniqueArtists = extractUniqueArtists(userData.streamingHistory.music);
            console.log(`User: ${userData.user}, Unique Artists: ${uniqueArtists.length}`);

            // Authenticate with Spotify API
            const accessToken = await getSpotifyAccessToken(clientId, clientSecret);

            const artistGenreData = {};
            for (const artist of uniqueArtists) {
                try {
                    const artistData = await fetchArtistData(artist, accessToken);
                    artistGenreData[artistData.name] = artistData.genres;
                    console.log(`Fetched genres for: ${artistData.name}`);
                } catch (error) {
                    console.error(`Error fetching data for ${artist}:`, error.message);
                }
            }

            // Save to JSON file
            const fileName = `artistGenres_${userData.user}.json`;
            const blob = new Blob([JSON.stringify(artistGenreData, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            console.log(`Genre data saved for user: ${userData.user}`);
        } catch (error) {
            console.error(`Error for user ${userData.user}:`, error.message);
        }
    }
}


init();

