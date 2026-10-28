from django.urls import path
from . import views

urlpatterns = [
    path("countries/",   views.CountriesView.as_view()),
    path("suggestions/", views.SuggestionsView.as_view()),
    path("country/",     views.CountryView.as_view()),
    path("extra/",       views.ExtraView.as_view()),
    path("health/",      views.HealthView.as_view()),
]
