import json

# Data from Wikipedia's "List of highest-grossing films" (as of 2024)
movies = [
    {
        "rank": 1,
        "title": "Avatar",
        "worldwide_gross": "$2,923,706,026",
        "year": 2009
    },
    {
        "rank": 2,
        "title": "Avengers: Endgame",
        "worldwide_gross": "$2,799,439,100",
        "year": 2019
    },
    {
        "rank": 3,
        "title": "Avatar: The Way of Water",
        "worldwide_gross": "$2,320,250,281",
        "year": 2022
    },
    {
        "rank": 4,
        "title": "Titanic",
        "worldwide_gross": "$2,264,750,694",
        "year": 1997
    },
    {
        "rank": 5,
        "title": "Star Wars: The Force Awakens",
        "worldwide_gross": "$2,071,310,218",
        "year": 2015
    }
]

with open('top_movies.json', 'w') as f:
    json.dump(movies, f, indent=2)

print('top_movies.json created successfully.')
