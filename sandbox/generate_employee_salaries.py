import csv
import random

# Set seed for reproducibility (optional)
random.seed(42)

# Generate 20 employees with random salaries between 50000 and 150000
employees = []
for i in range(1, 21):
    employee_id = f'EMP{i:03d}'
    salary = random.randint(50000, 150000)
    employees.append({'Employee_ID': employee_id, 'Salary': salary})

# Write to CSV
with open('employee_salaries.csv', 'w', newline='') as csvfile:
    fieldnames = ['Employee_ID', 'Salary']
    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
    writer.writeheader()
    for emp in employees:
        writer.writerow(emp)

print('employee_salaries.csv generated successfully.')
