import csv
import statistics

# Read the CSV file
salaries = []
with open('employee_salaries.csv', 'r') as file:
    reader = csv.DictReader(file)
    for row in reader:
        salaries.append(int(row['Salary']))

# Calculate statistics
average_salary = statistics.mean(salaries)
min_salary = min(salaries)
max_salary = max(salaries)

# Print results
print(f'Average Salary: {average_salary:.2f}')
print(f'Minimum Salary: {min_salary}')
print(f'Maximum Salary: {max_salary}')

# Save results to a text file for later use in markdown
with open('salary_stats.txt', 'w') as out:
    out.write(f'Average Salary: {average_salary:.2f}\n')
    out.write(f'Minimum Salary: {min_salary}\n')
    out.write(f'Maximum Salary: {max_salary}\n')