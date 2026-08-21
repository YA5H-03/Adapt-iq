# Adaptive Study Performance Dataset

## Overview

The **Adaptive Study Performance Dataset** is a synthetically generated dataset created for the **Study Planner & Tracker** project.

It is used to train and evaluate the machine learning model that analyzes student study-related factors and predicts their academic performance. The prediction can then be used to support the generation of a more adaptive and personalized study plan.

## Dataset Information

* **Dataset Type:** Synthetic
* **Number of Records:** 5,000
* **Number of Features:** 11 input features + 1 target variable
* **File:** `adaptive_study_performance_5000.csv`
* **Purpose:** Machine Learning model training and performance prediction

## Features

| Feature             | Description                                                 |
| ------------------- | ----------------------------------------------------------- |
| `student_id`        | Unique identifier assigned to each synthetic student record |
| `subject`           | Subject associated with the study record                    |
| `topic`             | Topic being studied                                         |
| `study_hours`       | Number of hours spent studying                              |
| `quiz_score`        | Score obtained in the quiz                                  |
| `previous_score`    | Score obtained in a previous assessment                     |
| `attempts`          | Number of attempts made for the topic/assessment            |
| `time_taken`        | Time spent completing the assessment/task                   |
| `days_to_exam`      | Number of days remaining before the examination             |
| `last_studied_days` | Number of days since the topic was last studied             |
| `topic_difficulty`  | Difficulty level of the topic                               |
| `performance`       | Target variable representing the student's performance      |

## Machine Learning Usage

The dataset follows the general workflow:

```text
Synthetic Dataset
       ↓
Data Preprocessing
       ↓
Feature Encoding
       ↓
Feature Selection
       ↓
Model Training
       ↓
Performance Prediction
       ↓
Adaptive Study Planning
```

The `performance` column is used as the **target variable**, while the remaining relevant attributes are used as input features for the machine learning model.

## Data Generation

The dataset is **synthetically generated** to simulate realistic student study and assessment patterns.

It does not represent actual academic records of real students.

Synthetic data was used because the project does not require collecting or exposing real student information during development and experimentation.

## Privacy

This dataset contains **no real student personal or academic information**.

The `student_id` values are synthetic identifiers and are not linked to real individuals.

## Purpose in the Project

The dataset supports the ML component of the Study Planner & Tracker by providing information related to:

* Study habits
* Quiz performance
* Previous academic performance
* Topic difficulty
* Study frequency
* Examination proximity
* Assessment attempts
* Time spent on assessments

These factors can help the system estimate performance and provide data-driven inputs for personalized study planning.

## Disclaimer

This dataset is intended **for development, experimentation, demonstration, and hackathon purposes**. The synthetic data should not be considered representative of actual student populations or used to make real-world academic decisions without appropriate validation using real-world data.