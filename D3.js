
async function populateUserSelect() {
    const allData = await loadAllUsersData();
    const userSelect = document.getElementById("user-select");

    allData.forEach((user, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = user.user; // User name
        userSelect.appendChild(option);
    });

}

async function onUserSelect(event) {
    const allData = await loadAllUsersData();
    const selectedIndex = event.target.value;

    // Clear previous visualizations
    d3.select("#treemap-container").html("");
    d3.select("#playlist-chart").html("");

    if (selectedIndex !== "") {
        const user = allData[selectedIndex]; // Get selected user data
        visualizePlaylists(user); // Visualize playlists
        await plotTopArtistsTreemap(user.user); // Visualize treemap for top artists
    }
}

async function visualizePlaylists(userData) {
    const playlistData = userData.playlists.map((playlist, index) => ({
        name: `Playlist ${index + 1}`,
        count: Array.isArray(playlist.items) ? playlist.items.length : 0,
    }));

    const width = 500;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 50, left: 50 };

    const svg = d3
        .select("#playlist-chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const xScale = d3
        .scaleBand()
        .domain(playlistData.map((d) => d.name))
        .range([margin.left, width - margin.right])
        .padding(0.2);

    const yScale = d3
        .scaleLinear()
        .domain([0, d3.max(playlistData, (d) => d.count)])
        .range([height - margin.bottom, margin.top]);

    svg.append("g")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(d3.axisBottom(xScale));

    svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale));

    svg.selectAll(".bar")
        .data(playlistData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (d) => xScale(d.name))
        .attr("y", (d) => yScale(d.count))
        .attr("width", xScale.bandwidth())
        .attr("height", (d) => height - margin.bottom - yScale(d.count))
        .attr("fill", "steelblue");
}


// Get the top 10 listened artist for each user 
async function getTopArtists(userFolder) {
    const allData = await loadAllUsersData();
    const userData = allData.find((user) => user.user === userFolder);

    if (!userData || !userData.YourLibrary?.tracks) {
        console.warn(`No library data found for user ${userFolder}`);
        return [];
    }

    const trackCounts = userData.YourLibrary.tracks.reduce((acc, track) => {
        acc[track.artist] = (acc[track.artist] || 0) + 1;
        return acc;
    }, {});

    return Object.entries(trackCounts)
        .map(([artist, count]) => ({ name: artist, value: count }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
}


// Draw the tp 10 artist treemap 
function drawTreemap(artistData) {
    const width = 500;
    const height = 300;

    // Create a color scale based on artist names
    const colorScale = d3.scaleOrdinal()
        .domain(artistData.map(d => d.name)) // Map each artist name
        .range(d3.schemeCategory10); // Use a predefined color scheme

    const treemap = d3.treemap()
        .size([width, height])
        .padding(1);

    const root = d3.hierarchy({ children: artistData })
        .sum(d => d.value);

    treemap(root);

    const svg = d3.select("#treemap-container")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const cell = svg.selectAll("g")
        .data(root.leaves())
        .enter().append("g")
        .attr("transform", d => `translate(${d.x0},${d.y0})`);

    // Add rectangles and fill them with the color associated with each artist
    cell.append("rect")
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("fill", d => colorScale(d.data.name)); // Use the color scale

    // Add artist names as text labels
    cell.append("text")
        .attr("x", 5)
        .attr("y", 15)
        .attr("dy", ".35em")
        .style("font-size", "12px")
        .style("fill", "white") // Ensure text is visible on dark colors
        .text(d => d.data.name)
        .each(function (d) {
            // Trim long names to fit within the rectangle
            const textLength = this.getComputedTextLength();
            const rectWidth = d.x1 - d.x0;
            if (textLength > rectWidth) {
                d3.select(this).text(d.data.name.substring(0, rectWidth / 8) + "...");
            }
        });
}

async function plotTopArtistsTreemap(userFolder) {
    const topArtists = await getTopArtists(userFolder);
    if (topArtists.length > 0) {
        drawTreemap(topArtists);
    } else {
        console.warn("No artists found for this user.");
    }
}




// Top track per month 
async function visualizeTopTracksPerMonth(userData) {
    const streamingData = userData.streamingHistory.music;

    // Parse the data and group by year, month, and track
    const groupedData = d3.group(streamingData, d => {
        const date = new Date(d.endTime);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    });

    // Aggregate msPlayed for each track within each month
    const monthlyAggregatedData = Array.from(groupedData, ([month, tracks]) => {
        const trackMap = new Map();

        tracks.forEach(({ trackName, artistName, msPlayed }) => {
            const key = `${trackName} - ${artistName}`;
            if (trackMap.has(key)) {
                trackMap.set(key, trackMap.get(key) + msPlayed);
            } else {
                trackMap.set(key, msPlayed);
            }
        });

        // Find the track with the maximum msPlayed for the month
        const [topTrack, topMsPlayed] = Array.from(trackMap.entries()).reduce(
            (max, entry) => (entry[1] > max[1] ? entry : max),
            ["", 0]
        );

        return {
            month,
            track: topTrack.split(" - ")[0],
            artist: topTrack.split(" - ")[1],
            msPlayed: topMsPlayed
        };
    });

    // Dimensions
    const width = 900;
    const height = 500;
    const margin = { top: 20, right: 30, bottom: 100, left: 70 };

    // Scales
    const xScale = d3.scaleBand()
        .domain(monthlyAggregatedData.map(d => d.month))
        .range([margin.left, width - margin.right])
        .padding(0.2);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(monthlyAggregatedData, d => d.msPlayed)])
        .nice()
        .range([height - margin.bottom, margin.top]);

    // Create SVG
    const svg = d3.select("#top-tracks-chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Add X Axis
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    // Add Y Axis
    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale));

    // Bars
    svg.selectAll(".bar")
        .data(monthlyAggregatedData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.month))
        .attr("y", d => yScale(d.msPlayed))
        .attr("width", xScale.bandwidth())
        .attr("height", d => height - margin.bottom - yScale(d.msPlayed))
        .attr("fill", "steelblue")
        .on("mouseover", (event, d) => {
            const tooltip = d3.select("#tooltip");
            tooltip.style("opacity", 1)
                .html(`
                    <strong>Month:</strong> ${d.month}<br>
                    <strong>Track:</strong> ${d.track}<br>
                    <strong>Artist:</strong> ${d.artist}<br>
                    <strong>Time Played:</strong> ${d.msPlayed} ms
                `)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY + 10}px`);
        })
        .on("mouseout", () => d3.select("#tooltip").style("opacity", 0));

    // Add Labels
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - margin.bottom + 50)
        .attr("text-anchor", "middle")
        .text("Months");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", margin.left - 50)
        .attr("text-anchor", "middle")
        .text("Streaming Time (ms)");
}


// Initialize dropdown and event listener
populateUserSelect();
document.getElementById("user-select").addEventListener("change", onUserSelect);
