import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newFeatures, setNewFeatures] = useState([{
    title: '',
    description: '',
    releaseDate: ''
  }]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const { accessToken, idToken } = (await fetchAuthSession()).tokens ?? {};

        if (!accessToken || !idToken) {
          throw new Error('No valid tokens found');
        }

        const response = await axios.get(`${process.env.REACT_APP_LAMBDA_URL}`, {
          headers: {
            "Authorization": `Bearer ${idToken.toString()}`
          }
        });

        setAnnouncements(response.data.announcements);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching announcements:', error);
        setError('Failed to load announcements.');
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  const handleInputChange = (index, event) => {
    const { name, value } = event.target;
    const updatedFeatures = [...newFeatures];
    updatedFeatures[index][name] = value;
    setNewFeatures(updatedFeatures);
  };

  const addNewFeature = () => {
    setNewFeatures([...newFeatures, { title: '', description: '', releaseDate: '' }]);
  };

  const removeFeature = (index) => {
    const updatedFeatures = newFeatures.filter((_, i) => i !== index);
    setNewFeatures(updatedFeatures);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const { idToken } = (await fetchAuthSession()).tokens ?? {};
  
      // Ensure that all fields have values
      const isValid = newFeatures.every(feature => 
        feature.title && feature.description && feature.releaseDate
      );
  
      if (!isValid) {
        setError('All fields are required for each feature');
        return;
      }
  
      const requestBody = {
        features: newFeatures  // Send the array of features
      };
  
      const response = await axios.post(`${process.env.REACT_APP_LAMBDA_URL}`, requestBody, {
        headers: {
          "Authorization": `Bearer ${idToken.toString()}`,
          "Content-Type": "application/json"
        }
      });
  
      setAnnouncements([...announcements, ...response.data.announcements]);
      setNewFeatures([{ title: '', description: '', releaseDate: '' }]);  // Reset form after successful submission
      setError('');  // Clear any previous errors
    } catch (error) {
      console.error('Error submitting announcement:', error);
      setError('Failed to submit announcement.');
    }
  };
  

  if (loading) {
    return <p>Loading announcements...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div className="announcements">
      <h2>Announcements</h2>

      {/* Display Announcements */}
      {announcements.length > 0 ? (
        <ul>
          {announcements.map((announcement) => (
            <li key={announcement.id}>
              <h3>{announcement.title}</h3>
              <p>{announcement.description}</p>
              <p><strong>Release Date:</strong> {announcement.releaseDate}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No announcements found.</p>
      )}

      {/* Form to Submit New Features */}
      <div className="new-feature-form">
        <h3>Submit New Features</h3>
        <form onSubmit={handleSubmit}>
          {newFeatures.map((feature, index) => (
            <div key={index} className="feature-input">
              <label>Feature Title:</label>
              <input
                type="text"
                name="title"
                value={feature.title}
                onChange={(event) => handleInputChange(index, event)}
                required
              />
              <label>Description:</label>
              <textarea
                name="description"
                value={feature.description}
                onChange={(event) => handleInputChange(index, event)}
                required
              />
              <label>Release Date:</label>
              <input
                type="date"
                name="releaseDate"
                value={feature.releaseDate}
                onChange={(event) => handleInputChange(index, event)}
                required
              />
              <button type="button" onClick={() => removeFeature(index)}>
                Remove Feature
              </button>
            </div>
          ))}
          <button type="button" onClick={addNewFeature}>
            Add Another Feature
          </button>
          <button type="submit">Submit Features</button>
        </form>
      </div>
    </div>
  );
}

export default Announcements;
