import csv
import statistics

# Read the CSV file
salaries = []
with open('employee_salaries.csv', 'r') as file:
    reader = csv.DictReader(file)
    for row in reader:
        salaries.append(int(row['Salary']))

# Calculate statistics
avg_salary = statistics.mean(salaries)
min_salary = min(salaries)
max_salary = max(salaries)

# Generate Markdown report
report = f'''# Salary Report

## Summary Statistics

- **Average Salary**: ${avg_salary:,.2f}
- **Minimum Salary**: ${min_salary:,}
- **Maximum Salary**: ${max_salary:,}
- **Number of Employees**: {len(salaries)}

## Data Source

Data generated from `employee_salaries.csv` with 20 employees.
'''

with open('Salary_Report.md', 'w') as md_file:
    md_file.write(report)

print('Salary_Report.md created successfully.')
print(f'Average: {avg_salary:.2f}, Min: {min_salary}, Max: {max_salary}')
