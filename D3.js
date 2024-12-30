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
    
    if (selectedIndex !== ""){
        const user_data = allData[selectedIndex]; // Obtenir les données de l'utilisateur
        console.log("---------------------------", user_data.user);
        const genreData = await loadGenreData(user_data.user);
        
        await visualizePlaylists(user_data);
        await ecoutesChart(user_data);
        await visualizeMonthlyListening(user_data);
        await plotTopArtistsTreemap(user_data);
        await plotGenrePieChart(genreData);
        await visualizeTopSearchQueries(user_data);

        
    }
    else{
        document.getElementById("playlist-chart").innerHTML = "";
    }

}


populateUserSelect();

document.getElementById("user-select").addEventListener("change", onUserSelect);

// **************************
// ********* Slot 1 *********
// **************************

// Visualize the playlists

async function visualizePlaylists(userData){
    const playlistData = userData.playlists.map((playlist, index) => {
        const name = playlist.name || "Untitled Playlist";
        const itemCount = Array.isArray(playlist.items) ? playlist.items.length : 0;
        return { name: name, count: itemCount };
    });

    const width = 500;
    const height = 300; 
    const margin = {top: 20, right: 20, bottom: 50, left: 50};

    // Effacer l'ancien contenu de la div
    d3.select("#playlist-chart").selectAll("*").remove();

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

// **************************
// ********* Slot 2 *********
// **************************

// Top serach queries history

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

    // Effacer l'ancien contenu de la div
    d3.select("#top15Searches").selectAll("*").remove();

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


// **************************
// ********* Slot 3 *********
// **************************

// Listening time distribution

async function ecoutesChart(userData){
   // Vérification des données
   if (!userData.streamingHistory || !Array.isArray(userData.streamingHistory.music)) {
    console.error("streamingHistory ou music est manquant pour cet utilisateur.");
    return;
    }

    // Définir les périodes
    const periodes = [
        { start: 0, end: 6, label: "Minuit - 6h" },
        { start: 6, end: 9, label: "6h - 9h" },
        { start: 9, end: 12, label: "9h - 12h" },
        { start: 12, end: 18, label: "12h - 18h" },
        { start: 18, end: 24, label: "18h - Minuit" }
    ];

    // Calcul des moyennes d'écoute
    const getHour = (dateString) => {
        const [date, time] = dateString.split(' ');
        const [hour] = time.split(':');
        return parseInt(hour, 10);
    };

    const moyennesEcoute = periodes.map(period => {
        const ecoutes = userData.streamingHistory.music.filter(entry => {
            const heure = getHour(entry.endTime);
            return heure >= period.start && heure < period.end;
        });

        const totalMs = ecoutes.reduce((sum, entry) => sum + entry.msPlayed, 0);
        return ecoutes.length ? (totalMs / ecoutes.length) / 1000 : 0; // Moyenne en secondes
    });

    // Dimensions du graphique
    const width = 500;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 50, left: 50 }; 

    // Effacer l'ancien contenu de la div
    d3.select("#ecoutesChart").selectAll("*").remove();

    // Créer le conteneur SVG dans le <div>
    const svg = d3.select("#ecoutesChart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Echelle des axes
    const x = d3.scaleBand()
        .domain(periodes.map(p => p.label))
        .range([margin.left, width - margin.right])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(moyennesEcoute)]) // Empêche une échelle vide
        .nice()
        .range([height - margin.bottom, margin.top]);

    // Ajouter l'axe X
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x))

    // Ajouter l'axe Y
    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));
        
    // Ajouter les barres
    svg.selectAll(".bar")
        .data(moyennesEcoute)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (_, i) => x(periodes[i].label))
        .attr("y", d => y(d))
        .attr("width", x.bandwidth())
        .attr("height", d => height - margin.bottom - y(d))
        .attr("fill", "steelblue");
}




// **************************
// ********* Slot 4 *********
// **************************

// Visualize the total listening time per month (Line chart)

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

    // Effacer l'ancien contenu de la div
    d3.select("#listeningTimelineChart").selectAll("*").remove();

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


// **************************
// ********* Slot 5 *********
// **************************

// Top 10 artist treemap

// Get the top 10 listened artist for each user 
async function getTopArtists(userData) {
    
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


// Draw the top 10 artist treemap 
function drawTreemap(artistData) {
    const width = 500;
    const height = 300;
    d3.select("#treemap-container").selectAll("*").remove();

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

// Plot the treemap
async function plotTopArtistsTreemap(userFolder) {
    const topArtists = await getTopArtists(userFolder);
    if (topArtists.length > 0) {
        drawTreemap(topArtists);
    } else {
        console.warn("No artists found for this user.");
    }
}


// **************************
// ********* Slot 6 *********
// **************************

// Plot the genre distribution

// Function to aggregate and count genres
function aggregateGenres(genreData) {
    const genreCount = {};

    // Iterate through each artist's genres
    for (const artist in genreData) {

        const genres = genreData[artist];
        
        genres.forEach((genre) => {
            // Count occurrences of each genre
            if (genreCount[genre]) {
                genreCount[genre]++;
            } else {
                genreCount[genre] = 1;
            }
        });
    }

    // Convert the genreCount object to an array of [genre, count] pairs
    const genreArray = Object.keys(genreCount).map((genre) => ({
        genre: genre,
        count: genreCount[genre],
    }));

    // Sort genres by count in descending order
    genreArray.sort((a, b) => b.count - a.count);
    console.log(genreArray.length)

    // Keep only the top 10 genres
    return genreArray.slice(0, 10);
}

function plotGenrePieChart(genreData) {
    // Step 1: Aggregate genres
    const topGenres = aggregateGenres(genreData);

    // Step 2: Set up the pie chart
    const width = 300, height = 300, radius = Math.min(width, height) / 2;
    d3.select("#pieChart").selectAll("*").remove();

    // Use a color scale based on the genre names
    const color = d3.scaleOrdinal()
        .domain(topGenres.map(d => d.genre))  // Map genre names to the domain
        .range(d3.schemeSet3);  // You can replace d3.schemeSet3 with any other color palette or define your own

    // Create SVG element and append a group for the pie chart
    const svg = d3.select("#pieChart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`); // Center the pie chart inside the SVG

    // Create pie function for calculating the angle of each slice
    const pie = d3.pie().value((d) => d.count);
    const arc = d3.arc().outerRadius(radius).innerRadius(0);  // Pie slices

    // Step 3: Bind data to pie chart and create the slices
    const arcs = svg.selectAll(".arc")
        .data(pie(topGenres))
        .enter()
        .append("g")
        .attr("class", "arc");

    // Append pie slices
    arcs.append("path")
        .attr("d", arc)
        .style("fill", (d) => color(d.data.genre));

    // Add percentage labels inside each slice
    arcs.append("text")
        .attr("transform", (d) => `translate(${arc.centroid(d)})`)
        .attr("class", "percentage")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text((d) => `${Math.round((d.data.count / d3.sum(topGenres, (d) => d.count)) * 100)}%`);

    // Step 4: Create the legend on the right side of the chart
    const legendWidth = 12;   // Smaller size for the dots
    const legendHeight = 12;  // Smaller size for the dots
    const legendSpacing = 18; // Adjust the vertical spacing between legend items to ensure all 20 fit
    const legend = svg.append("g")
        .attr("transform", `translate(${width / 2 + radius + 10}, ${-radius / 2})`); // Position the legend to the right of the pie chart

    // Add legend items (color and genre name)
    legend.selectAll(".legend")
        .data(topGenres)
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => `translate(0, ${i * legendSpacing})`) // Increase vertical spacing

        // Add colored circles to legend
        .append("circle")
        .attr("cx", 0)
        .attr("cy", legendHeight / 2)  // Position circle vertically centered
        .attr("r", 6)  // Small dot size
        .style("fill", (d) => color(d.genre));

    // Add genre text to the legend
    legend.selectAll(".legendText")
        .data(topGenres)
        .enter()
        .append("text")
        .attr("x", legendWidth + 5)
        .attr("y", (d, i) => i * legendSpacing + legendHeight / 2)
        .attr("dy", ".35em")
        .text((d) => d.genre)
        .style("font-size", "12px");
}
