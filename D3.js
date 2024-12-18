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
        await visualizePlaylists(user_data);
        await ecoutesChart(user_data);
        await visualizeMonthlyListening(user_data);
        await plotTopArtistsTreemap(user_data);

        
    }
    else{
        document.getElementById("playlist-chart").innerHTML = "";
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


populateUserSelect();

document.getElementById("user-select").addEventListener("change", onUserSelect);



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
    // Effacer l'ancien contenu de la div
    d3.select("#listeningTimelineChart").selectAll("*").remove();

    const svg = d3.select("#listeningTimelineChart")
                  .append("svg")
                  .attr("width", width)
                  .attr("height", height);

    const xScale = d3.scaleBand()
                     .domain(months)
                     .range([margin.left, width - margin.right])
                     .padding(0.1);

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

    svg.selectAll("circle")
       .data(minutes)
       .enter()
       .append("circle")
       .attr("cx", (d, i) => xScale(months[i]))
       .attr("cy", d => yScale(d))
       .attr("r", 5)
       .attr("fill", "red");
}

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


// Draw the tp 10 artist treemap 
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

async function plotTopArtistsTreemap(userFolder) {
    const topArtists = await getTopArtists(userFolder);
    if (topArtists.length > 0) {
        drawTreemap(topArtists);
    } else {
        console.warn("No artists found for this user.");
    }
}
