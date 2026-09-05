def fibonacci(n):
    sequence = []
    a, b = 0, 1
    for _ in range(n):
        sequence.append(a)
        a, b = b, a + b
    return sequence

if __name__ == "__main__":
    fib_numbers = fibonacci(20)
    print("First 20 Fibonacci numbers:")
    for i, num in enumerate(fib_numbers):
        print(f"F({i}) = {num}")
    print("\nSequence as list:")
    print(fib_numbers)