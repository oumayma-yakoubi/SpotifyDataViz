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
        const user = allData[selectedIndex]; // Obtenir les données de l'utilisateur
        await visualizePlaylists(user);
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