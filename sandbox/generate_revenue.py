import csv
import random
from datetime import datetime, timedelta

# Generate 50 months of revenue data starting from Jan 2020
start_date = datetime(2020, 1, 1)
revenue_data = []

for i in range(50):
    month = start_date + timedelta(days=30*i)
    # Random revenue between $10,000 and $500,000
    revenue = round(random.uniform(10000, 500000), 2)
    revenue_data.append([month.strftime('%Y-%m'), revenue])

# Write to CSV
with open('revenue.csv', 'w', newline='') as file:
    writer = csv.writer(file)
    writer.writerow(['Month', 'Revenue'])
    writer.writerows(revenue_data)

print('revenue.csv generated with 50 data points')