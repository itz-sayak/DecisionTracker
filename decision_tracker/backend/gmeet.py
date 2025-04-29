from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
import time
import pytz
from datetime import datetime
import getpass


def Glogin(driver, mail_address, password):
    driver.get(
        "https://accounts.google.com/ServiceLogin?hl=en&passive=true&continue=https://www.google.com/&ec=GAZAAQ"
    )
    driver.find_element(By.ID, "identifierId").send_keys(mail_address)
    driver.find_element(By.ID, "identifierNext").click()
    driver.implicitly_wait(10)
    driver.find_element(
        By.XPATH, '//*[@id="password"]/div[1]/div/div[1]/input'
    ).send_keys(password)
    driver.implicitly_wait(10)
    time.sleep(2)
    driver.find_element(By.ID, "passwordNext").click()
    driver.implicitly_wait(10)
    driver.get("https://accounts.google.com/")
    driver.implicitly_wait(10)


def turnOffMicCam(driver):
    time.sleep(2)
    try:
        mic_button = driver.find_element(
            By.XPATH, "//div[@aria-label='Turn off microphone']"
        )
        if mic_button:
            mic_button.click()
            print("Microphone turned off.")
    except Exception:
        print("Microphone button not found or already muted.")

    time.sleep(1)
    try:
        camera_button = driver.find_element(
            By.XPATH, "//div[@aria-label='Turn off camera']"
        )
        if camera_button:
            camera_button.click()
            print("Camera turned off.")
    except Exception:
        print("Camera button not found or already off.")

    time.sleep(1)
    try:
        join_button = driver.find_element(By.XPATH, "//span[text()='Join now']")
        join_button.click()
        print("Joined the meeting.")
    except Exception:
        print("Join button not found.")
        try:
            ask_to_join_button = driver.find_element(
                By.XPATH, "//span[text()='Ask to join']"
            )
            ask_to_join_button.click()
            print("Requested to join the meeting.")
        except Exception:
            print("Neither 'Join now' nor 'Ask to join' button was found.")


def joinNow(driver, meeting_link):
    driver.get(meeting_link)
    turnOffMicCam(driver)
    print("Meeting started.")
    
    # Keep the script running until manually interrupted
    try:
        while True:
            time.sleep(60)  # Check every minute
    except KeyboardInterrupt:
        driver.quit()
        print("Meeting ended. Chrome tab closed.")

# Only run this code if the script is executed directly (not imported)
if __name__ == "__main__":
    # Your Gmail credentials
    mail_address = "reynoldsvarcity@gmail.com"  # Replace with your Gmail
    password = "hello*123#"  # Replace with your password
    meeting_link = "https://meet.google.com/ggj-fvka-xva"  # Replace with your Google Meet link
    
    opt = Options()
    opt.add_argument("--disable-blink-features=AutomationControlled")
    opt.add_argument("--start-maximized")
    opt.add_experimental_option(
        "prefs",
        {
            "profile.default_content_setting_values.media_stream_mic": 1,
            "profile.default_content_setting_values.media_stream_camera": 1,
            "profile.default_content_setting_values.geolocation": 0,
            "profile.default_content_setting_values.notifications": 1,
        },
    )
    
    driver = webdriver.Chrome(options=opt)
    Glogin(driver, mail_address, password)
    joinNow(driver, meeting_link)
