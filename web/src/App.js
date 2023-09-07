import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./App.css";

const baseUrl = 'http://localhost:5001';

function App() {
  const titleInputRef = useRef(null);
  const bodyInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState("");
  const [data, setData] = useState([]);
  const [currentWeather, setCurrentWeather] = useState(null);

  useEffect(() => {
    if (alert) {
      setTimeout(() => {
        setAlert("");
        console.log("Timeout");
      }, 4000)
      console.log("Effect");
    }
  }, [alert]);
  
  useEffect(() => {
    getAllStories();
  }, []);
  
  const getAllStories = async () => {
    try {
      const resp = await axios.get(`${baseUrl}/api/v1/stories`);
      console.log(resp.data);
      setData(resp.data);
    } catch (error) {
      console.error("Error fetching stories:", error);
    }
  }
  
  const postStory = async (event) => {
    event.preventDefault();

    try {
      setIsLoading(true);

      const response = await axios.post(`${baseUrl}/api/v1/story`, {
        title: titleInputRef.current.value,
        body: bodyInputRef.current.value,
      });
      console.log("Response: ", response.data);

      setIsLoading(false);

      setAlert(response?.data?.message);
      event.target.reset();
    } catch (e) {
      setIsLoading(false);
      console.log(e);
    }
  };

  return (
    <div>
      <h1>Social Stories</h1>

      <form onSubmit={postStory}>
        <label htmlFor="titleInput">Title: </label>
        <input
          type="text"
          id="titleInput"
          maxLength={20}
          minLength={2}
          required
          ref={titleInputRef}
        />
        <br />
        <label htmlFor="bodyInput">What's on your mind: </label>
        <textarea
          type="text"
          id="bodyInput"
          maxLength={999}
          minLength={10}
          required
          ref={bodyInputRef}
        ></textarea>

        <br />
        <button type="submit">Post</button>
      </form>

      {alert && <div className="alert">{alert}</div>}

      <br />
      <hr />
      <br />

      {/* You can render the data here */}
      <ul>
        {data.map((story) => (
          <li key={story.id}>
            <strong>Title:</strong> {story.title}
            <br />
            <strong>Body:</strong> {story.body}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
