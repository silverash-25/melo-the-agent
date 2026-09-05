import datetime
with open("time.txt", "w") as f:
    f.write(str(datetime.datetime.now()))