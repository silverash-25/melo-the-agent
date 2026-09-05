import csv

# Planet data: name, mass (kg), radius (m)
planets = [
    ("Mercury", 3.3011e23, 2.4397e6),
    ("Venus", 4.8675e24, 6.0518e6),
    ("Earth", 5.97237e24, 6.371e6),
    ("Mars", 6.4171e23, 3.3895e6),
    ("Jupiter", 1.8982e27, 6.9911e7),
    ("Saturn", 5.6834e26, 5.8232e7),
    ("Uranus", 8.6810e25, 2.5362e7),
    ("Neptune", 1.02413e26, 2.4622e7),
]

with open('planets.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['Planet', 'Mass_kg', 'Radius_m'])
    for name, mass, radius in planets:
        writer.writerow([name, mass, radius])

print('planets.csv created successfully.')
