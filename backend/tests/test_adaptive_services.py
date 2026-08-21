import unittest

from app.services.performance import calculate_performance
from app.services.prompt_builder import build_adaptive_quiz_prompt


class AdaptivePerformanceTests(unittest.TestCase):
    def test_first_attempt_has_no_invented_history(self):
        performance = calculate_performance([], "weak")
        self.assertIsNone(performance["previous_score"])
        self.assertIsNone(performance["current_score"])
        self.assertEqual(performance["attempt_count"], 0)
        self.assertEqual(performance["trend"], "not_available")
        prompt = build_adaptive_quiz_prompt(
            subject="Data Structures", module="Trees", num_questions=10,
            performance=performance, difficulty=performance["next_difficulty"],
        )
        self.assertIn("first quiz", prompt)

    def test_increasing_scores_are_improving(self):
        attempts = [{"score": score} for score in (40, 55, 65, 75)]
        performance = calculate_performance(attempts, "average")
        self.assertEqual(performance["current_score"], 75.0)
        self.assertEqual(performance["previous_score"], 65.0)
        self.assertEqual(performance["trend"], "improving")
        self.assertEqual(performance["performance_level"], "good")
        self.assertEqual(performance["next_difficulty"], "medium-hard")

    def test_repeated_missed_concept_becomes_weak_area(self):
        attempts = [
            {"score": 60, "questionResults": [{"concept": "AVL rotations", "isCorrect": False}]},
            {"score": 65, "questionResults": [{"concept": "AVL rotations", "isCorrect": False}]},
        ]
        self.assertEqual(calculate_performance(attempts, "average")["weak_areas"], ["AVL rotations"])


if __name__ == "__main__":
    unittest.main()
