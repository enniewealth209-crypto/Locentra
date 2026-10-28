from django.test import SimpleTestCase


class CountriesApiTests(SimpleTestCase):
    def test_list_returns_country_records(self):
        response = self.client.get("/api/countries/")

        self.assertEqual(response.status_code, 200)
        countries = response.json()
        self.assertEqual(len(countries), 194)
        self.assertEqual(countries[0]["name"], "Afghanistan")

    def test_country_search_returns_not_found(self):
        response = self.client.get("/api/country/?q=NotARealCountry")

        self.assertEqual(response.status_code, 404)