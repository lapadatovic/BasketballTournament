const fsPromises = require('fs').promises

const generateScore = () => Math.floor(Math.random() * 100) + 62;

// read the groups file and get the data from file
const readFileData = async (filePath) => {
    try {
        const data = await fsPromises.readFile(filePath, 'utf-8'); // 'utf-8' to get string data
        // console.log(data); // Log the data after reading it
        return data;
    } catch (err) {
        console.error('Error reading file:', err);
        throw err; // Rethrow the error for further handling if necessary
    }
};
const calculateWinProbability = (ratingA, ratingB) => {
    const exponent = (ratingA - ratingB) / 400;
    const probability = 1 / (1 + Math.pow(10, exponent));
    return probability;
}

const simulateGame = (team1, team2) =>  {
    const winChanceForTeamOne = calculateWinProbability(team1.FIBARanking, team2.FIBARanking);
    const winChanceForTeamTwo= 1 - winChanceForTeamOne;

    const team1Score = generateScore();
    const team2Score = generateScore();

    // WC -> Win Chance
    // uncoment first line to see result
    // console.log(`WC: ${(winChanceForTeamOne * 100).toFixed(2)}% \t${(winChanceForTeamTwo * 100).toFixed(2)}%`);

    return {team1Score, team2Score}
}

const groupPhase = async () => {
    const groupsData = await readFileData('./data/groups.json');
    const groupTeamsObj = JSON.parse(groupsData);

    let finalGroupResult = {};
    Object.keys(groupTeamsObj).forEach(group => {
        const groupTeams = groupTeamsObj[group]
        // console.log(`\nGroup ${group}:`);

        finalGroupResult[group] = {};
        groupTeams.forEach(team => {
            finalGroupResult[group][team.ISOCode] = [];
        });
        
        //We loop in Group and pair the every team to play with each other
        for (let i = 0; i < groupTeams.length; i++) {
            for (let j = i + 1; j < groupTeams.length; j++) {
                const team1 = groupTeams[i];
                const team2 = groupTeams[j];
                const results = simulateGame(team1, team2);
                
                const { team1Score, team2Score } = results;
                // console.log(`${team1.ISOCode} ${team1Score} vs ${team2.ISOCode} ${team2Score}`);
                
                finalGroupResult[group][team1.ISOCode].push({
                    "Team":team1.Team,
                    "Opponent": team2.ISOCode,
                    "Result": `${team1Score}-${team2Score}`
                });

                // Store results for team2
                finalGroupResult[group][team2.ISOCode].push({
                    "Team":team2.Team,
                    "Opponent": team1.ISOCode,
                    "Result": `${team2Score}-${team1Score}`
                });  
            }   
        };
    });
    return finalGroupResult;
};

const rankTeamsAndShowTableByGroup = async () => {
    const groupPhaseResults = await groupPhase();
    let dataForSort = {}; // Initialize outside the loops

    // Iterate over each group
    Object.keys(groupPhaseResults).forEach((group) => {
        // console.log(`\nGroup ${group}:`);  
        
        dataForSort[group] = []; // Initialize an empty array for each group

        // Iterate over each team in the group
        Object.keys(groupPhaseResults[group]).forEach((team) => {
            let wonMatches = 0;
            let lostMatches = 0;
            let points = 0;
            let totalAchievedPoints = 0;
            let totalConcededPoints = 0;  // Points received from opponents
            let pointsDifference = 0; // Difference between achieved and received points

            // Iterate over each match the team played
            groupPhaseResults[group][team].forEach((match) => {
                const [achievedPoints, opponentPoints] = match.Result.split('-').map(Number);
                
                if (achievedPoints > opponentPoints) {
                    wonMatches++;
                } else {
                    lostMatches++;
                }

                totalAchievedPoints += achievedPoints;
                totalConcededPoints += opponentPoints;
            });

            points = (wonMatches * 2) + (lostMatches * 1);
            pointsDifference = totalAchievedPoints - totalConcededPoints;

            // Push team data to the respective group in dataForSort
            dataForSort[group].push({
                group,
                team, 
                wonMatches, 
                lostMatches,
                points,
                totalAchievedPoints,
                totalConcededPoints,
                pointsDifference
            });
        });
    });
    // Now sort the teams in each group and display the results
    sortData(groupPhaseResults, dataForSort);
};

const sortData = (groupData, tableData) => {

    let finalGroupResult = groupData || '';
    let tableDataCpy = tableData;

    // console.log(JSON.stringify(finalGroupResult,null,2))

    // Sorted array by points 
    let teamsSortedByPoints = {};
    Object.keys(tableDataCpy).forEach((group) => {
        const teams = tableDataCpy[group];
        teamsSortedByPoints[group] = []
        // Sort teams by points in descending order
        teams.sort((a, b) => b.points - a.points);

        // Log the group name once
        console.log(`Group: ${group}`);
        
        // // Log each team in the group after sorting
        teams.forEach((team, index) => {
            teamsSortedByPoints[group].push(team);
            // console.log(`Team:  Win:  Lose:  Points:  Total Achived Points:  Total Conceded Points  Points Differecne`);
            // console.log(`${team.team} \t${team.wonMatches} \t${team.lostMatches} \t${team.points} \t\t${team.totalAchievedPoints}  \t\t${team.totalConcededPoints} \t\t\t${team.pointsDifference}`);
            console.log(`\nGroup: ${group}`);
            console.log("--------------------------------------------------");
            console.log("| Team   | Won | Lost | Points | Pts For | Pts Against | Pts Diff |");
            console.log("--------------------------------------------------");
            
            teamsSortedByPoints[group].forEach((team) => {
                console.log(
                    `| ${team.team.padEnd(6)} | ${String(team.wonMatches).padEnd(3)} | ${String(team.lostMatches).padEnd(4)} | ${String(team.points).padEnd(6)} | ${String(team.totalAchievedPoints).padEnd(7)} | ${String(team.totalConcededPoints).padEnd(11)} | ${String(team.pointsDifference).padEnd(8)} |`
                );
            });

            console.log("--------------------------------------------------");
        });
        return teamsSortedByPoints;
    });


    Object.keys(teamsSortedByPoints).forEach(group => {
        const teams = teamsSortedByPoints[group];
        
        // Object to keep track of teams with the same points
        const pointsMap = {};
      
        teams.forEach(team => {
          const points = team.points;
      
          // If points already exist in pointsMap, push the team into the array
          if (pointsMap[points]) {
            pointsMap[points].push(team);
          } else {
            // Otherwise, create a new array with the team
            pointsMap[points] = [team];
          }
        });
    
        Object.keys(pointsMap).forEach(points => {
            if (pointsMap[points].length > 1) {
                // If we have 2 teams with the same number of points
                if(pointsMap[points].length == 2){
                    pointsMap[points].sort((teamOne, teamTwo) => {
                        const teamOneStats = finalGroupResult[group][teamOne.team];
                        const teamTwoStats = finalGroupResult[group][teamTwo.team];

                        const TeamOneMatch = teamOneStats.find((match) => match.Opponent === teamTwo.team);
                        const TeamTwoMatch = teamTwoStats.find((match) => match.Opponent === teamOne.team);

                        // if match exist
                        if(TeamOneMatch && TeamTwoMatch) {
                            const teamOneScore = parseInt(TeamOneMatch.Result.split('-')[0], 10);
                            const teamTwoScore = parseInt(TeamTwoMatch.Result.split('-')[0], 10);

                            // If score Result is positive number that means TeamOne Won 
                            // else TeamTwo Won
                            return teamOneScore - teamTwoScore
                        }
                        // if there is not match we will return 0
                        return 0;
                    });  
                };
                // Case when we have 3 teams with the same number of points 
                if (pointsMap[points].length === 3) {
                    pointsMap[points].sort((teamOne, teamTwo) => {
                        const teamOneStats = finalGroupResult[group][teamOne.team];
                        const teamTwoStats = finalGroupResult[group][teamTwo.team];

                        // third team with the same points
                        const teamThree = pointsMap[points].find((findTeamThree) => findTeamThree.team !== teamOne.team && findTeamThree.team !== teamTwo.team);
                        // ThirdTeamStats -> inlude opponents
                        const teamThreeStats = finalGroupResult[group][teamThree.team];
                        
                        // Comparison logic
                        const teamOneVsTwo = teamOneStats.find((match) => match.Opponent === teamTwo.team);
                        const teamOneVsThree = teamOneStats.find((match) => match.Opponent === teamThree.team);
                        const teamTwoVsThree = teamTwoStats.find((match) => match.Opponent === teamThree.team);
                
                        const teamOneDifference = (teamOneVsTwo ? parseInt(teamOneVsTwo.Result.split('-')[0], 10) - parseInt(teamOneVsTwo.Result.split('-')[1], 10) : 0) +
                                                  (teamOneVsThree ? parseInt(teamOneVsThree.Result.split('-')[0], 10) - parseInt(teamOneVsThree.Result.split('-')[1], 10) : 0);
                        
                        const teamTwoDifference = (teamOneVsTwo ? parseInt(teamOneVsTwo.Result.split('-')[1], 10) - parseInt(teamOneVsTwo.Result.split('-')[0], 10) : 0) +
                                                  (teamTwoVsThree ? parseInt(teamTwoVsThree.Result.split('-')[0], 10) - parseInt(teamTwoVsThree.Result.split('-')[1], 10) : 0);
                
                        const teamThreeDifference = (teamOneVsThree ? parseInt(teamOneVsThree.Result.split('-')[1], 10) - parseInt(teamOneVsThree.Result.split('-')[0], 10) : 0) +
                                                    (teamTwoVsThree ? parseInt(teamTwoVsThree.Result.split('-')[1], 10) - parseInt(teamTwoVsThree.Result.split('-')[0], 10) : 0);
                
                        // Sorting logic
                        if (teamOneDifference !== teamTwoDifference) {
                            return teamTwoDifference - teamOneDifference;
                        } else if (teamOneDifference !== teamThreeDifference) {
                            return teamThreeDifference - teamOneDifference;
                        } else {
                            return teamThreeDifference - teamTwoDifference;
                        }
                    });
                }
            }
        });
    });

    return teamsSortedByPoints;
};

rankTeamsAndShowTableByGroup();

  
