// api.js
const fetchFeeds = async (page = 1) => {
  try {
    const res = await fetch(`http://localhost:5000/api/feeds?page=${page}`); // adjust your backend URL
    if (!res.ok) throw new Error("Failed to fetch feeds"); 
    return await res.json();
  } catch (err) {
    console.error("Error fetching feeds:", err);
    return [];
  }
};
