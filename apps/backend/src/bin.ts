import { app } from ".";

const PORT = process.env.PORT || 3000;
app.get("/", (_, res) => {
    res.send("Server running");
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});