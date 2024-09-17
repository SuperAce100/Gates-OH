import json
import matplotlib.pyplot as plt

file_path = 'gates-oh-default-rtdb-timeGraph-export.json'
with open(file_path, 'r') as file:
    data = json.load(file)

times = list(map(int, data.keys()))
progress = list(data.values())

# Preprocess time so the lowest value is 0, and offset subsequent times
min_time = min(times)
adjusted_times = [time - min_time for time in times]

# Plot progress over time
plt.figure(figsize=(10, 6))
plt.plot(adjusted_times, progress, marker='o', linestyle='-', color='b')
plt.title('Progress Over Time')
plt.xlabel('Time (ms, offset)')
plt.ylabel('Percent Progress')
plt.grid(True)
plt.show()
