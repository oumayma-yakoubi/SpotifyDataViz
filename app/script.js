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

        // Optionally add content to the other slots here if needed
        const firstSlot = document.getElementById("topArtistChart");
        firstSlot.innerHTML = "<p>Top artists or something else here...</p>";  // Placeholder or actual content

    } else {
        document.getElementById("topArtistChart").innerHTML = ""; // Clear the first slot
        document.getElementById("playlist-chart").innerHTML = ""; // Clear the second slot
        document.getElementById("top15Searches").innerHTML = ""; // Clear the third slot
        document.getElementById("listeningTimelineChart").innerHTML = ""; // Clear the fourth slot
        document.getElementById("popularityBubbleChart").innerHTML = ""; // Clear the fifth slot
    }
}

populateUserSelect();

document.getElementById("user-select").addEventListener("change", onUserSelect);
