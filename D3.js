async function populateUserSelect(){
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

    // Clear all visualizations
    document.getElementById("topArtistChart").innerHTML = ""; // Slot 1
    document.getElementById("playlist-chart").innerHTML = ""; // Slot 2
    document.getElementById("listeningTimelineChart").innerHTML = ""; // Slot 3
    document.getElementById("genreDistributionChart").innerHTML = ""; // Slot 4
    document.getElementById("popularityBubbleChart").innerHTML = ""; // Slot 5

    if (selectedIndex !== "") {
        const user = allData[selectedIndex]; // Get the user's data

        // Visualizations
        await visualizePlaylists(user);               // Slot 2
        await visualizeMonthlyListening(user);        // Slot 3
    }
}



async function visualizePlaylists(userData){
    const playlistData = userData.playlists.map((playlist, index) => {
        // Assurez-vous que playlist.items est un tableau valide avant d'essayer d'accéder à sa longueur
        const itemCount = Array.isArray(playlist.items) ? playlist.items.length : 0;
        return {
            name: `Playlist ${index + 1}`,
            count: itemCount
        };
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
       .attr("x", d => xScale(d.name))
       .attr("y", d => yScale(d.count))
       .attr("width", xScale.bandwidth())
       .attr("height", d => height - margin.bottom - yScale(d.count))
       .attr("fill", "steelblue");
}

async function visualizeMonthlyListening(userData) {
    // Clear previous content in the third slot
    const chartDiv = document.getElementById("listeningTimelineChart");
    chartDiv.innerHTML = ""; // Clear any existing SVG or content

    // Prepare the data: Group by month and calculate total minutes
    const musicHistory = userData.streamingHistory.music;
    const monthlyData = d3.rollups(
        musicHistory,
        v => d3.sum(v, d => d.msPlayed) / 60000, // Convert ms to minutes
        d => new Date(d.endTime).toISOString().slice(0, 7) // Extract YYYY-MM format
    ).map(([month, minutes]) => ({ month, minutes }));

    // Sort the data by month
    monthlyData.sort((a, b) => new Date(a.month) - new Date(b.month));

    // Dimensions and margins
    const width = 500;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 50, left: 60 };

    // Create the SVG
    const svg = d3.select("#listeningTimelineChart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Scales
    const xScale = d3.scaleTime()
        .domain(d3.extent(monthlyData, d => new Date(d.month)))
        .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(monthlyData, d => d.minutes)])
        .nice()
        .range([height - margin.bottom, margin.top]);

    // Axes
    svg.append("g")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%b %Y")));

    svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale).ticks(5));

    // Line generator
    const line = d3.line()
        .x(d => xScale(new Date(d.month)))
        .y(d => yScale(d.minutes));

    // Draw the line
    svg.append("path")
        .datum(monthlyData)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("d", line);

    // Add points
    svg.selectAll(".point")
        .data(monthlyData)
        .enter()
        .append("circle")
        .attr("class", "point")
        .attr("cx", d => xScale(new Date(d.month)))
        .attr("cy", d => yScale(d.minutes))
        .attr("r", 4)
        .attr("fill", "orange");

    // Add axis labels
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - margin.bottom + 40)
        .attr("text-anchor", "middle")
        .text("Month");

    svg.append("text")
        .attr("x", -(height / 2))
        .attr("y", margin.left - 50)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Minutes Listening");
}


populateUserSelect();

document.getElementById("user-select").addEventListener("change", onUserSelect);