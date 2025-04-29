import asyncio
import os
import time
import logging
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import re

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def setup_browser():
    """Set up and return a Chrome browser with specific options for Google Meet."""
    logger.info("Setting up Chrome browser for Google Meet")
    
    options = Options()
    options.add_argument("--use-fake-ui-for-media-stream")  # Auto-allow microphone/camera
    options.add_argument("--disable-notifications")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    
    # Remove user profile to avoid permissions issues
    # options.add_argument("--user-data-dir=C:\\Users\\user\\AppData\\Local\\Google\\Chrome\\User Data")
    
    # Add user agent to appear as a regular Chrome browser
    options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36")
    
    # Set permissions to allow microphone and camera
    options.add_experimental_option("prefs", {
        "profile.default_content_setting_values.media_stream_mic": 1,
        "profile.default_content_setting_values.media_stream_camera": 2  # Block camera
    })
    
    # Initialize browser
    service = Service(ChromeDriverManager().install())
    browser = webdriver.Chrome(service=service, options=options)
    browser.maximize_window()  # Maximize window for better interaction
    logger.info("Chrome browser initialized successfully")
    
    return browser

def format_meet_link(meet_link):
    """Format the meet link to ensure it's a valid Google Meet URL."""
    # Check if it's already a full URL
    if meet_link.startswith(("http://", "https://", "meet.google.com")):
        # Ensure it starts with https:// if it starts with meet.google.com
        if meet_link.startswith("meet.google.com"):
            meet_link = "https://" + meet_link
        return meet_link
    
    # Check if it's a valid meeting code
    if re.match(r'^[a-zA-Z0-9]{3,4}-[a-zA-Z0-9]{3,4}-[a-zA-Z0-9]{3,4}$', meet_link):
        return f"https://meet.google.com/{meet_link}"
    
    # If we can't determine the format, just return as is
    logger.warning(f"Unknown meeting link format: {meet_link}")
    return meet_link

async def login_to_google(browser, email, password):
    """
    Login to Google account with detailed error handling
    Returns True if login successful, False otherwise
    """
    try:
        logger.info("Navigating to Google login page...")
        browser.get("https://accounts.google.com/signin")
        browser.save_screenshot("google_login_start.png")
        
        # Wait for email input field
        logger.info("Waiting for email input field...")
        try:
            email_input = WebDriverWait(browser, 20).until(
                EC.presence_of_element_located((By.ID, "identifierId"))
            )
            logger.info("Email input field found")
        except Exception as e:
            logger.error(f"Failed to find email input field: {e}")
            browser.save_screenshot("email_input_error.png")
            
            # Try alternative selectors
            try:
                email_input = browser.find_element(By.NAME, "identifier")
                logger.info("Found email input by alternative selector")
            except:
                logger.error("Could not find email input field by any selector")
                return False
        
        # Enter email
        email_input.clear()
        email_input.send_keys(email)
        browser.save_screenshot("email_entered.png")
        
        # Find and click next button
        logger.info("Looking for 'Next' button after email...")
        try:
            next_button = WebDriverWait(browser, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//span[text()='Next']"))
            )
        except Exception:
            try:
                # Alternative selectors for the next button
                next_button = WebDriverWait(browser, 10).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, "#identifierNext button"))
                )
                logger.info("Found next button by alternative selector")
            except Exception as e:
                logger.error(f"Failed to find next button: {e}")
                browser.save_screenshot("next_button_error.png")
                return False
                
        logger.info("Clicking 'Next' after email...")
        next_button.click()
        
        # Wait for password field to appear
        await asyncio.sleep(3)  # Short wait for page transition
        browser.save_screenshot("after_email_next.png")
        
        # Find password field
        logger.info("Looking for password field...")
        try:
            password_input = WebDriverWait(browser, 20).until(
                EC.presence_of_element_located((By.NAME, "Passwd"))
            )
            logger.info("Password field found")
        except Exception as e:
            logger.error(f"Failed to find password field: {e}")
            browser.save_screenshot("password_field_error.png")
            return False
        
        # Enter password
        logger.info("Entering password...")
        password_input.clear()
        password_input.send_keys(password)
        browser.save_screenshot("password_entered.png")
        
        # Find and click sign in button
        logger.info("Looking for sign in button...")
        try:
            signin_button = WebDriverWait(browser, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//span[text()='Next']"))
            )
        except Exception:
            try:
                # Alternative selectors for the sign in button
                signin_button = WebDriverWait(browser, 10).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, "#passwordNext button"))
                )
                logger.info("Found sign in button by alternative selector")
            except Exception as e:
                logger.error(f"Failed to find sign in button: {e}")
                browser.save_screenshot("signin_button_error.png")
                return False
        
        logger.info("Clicking 'Next' to sign in...")
        signin_button.click()
        
        # Wait for login to complete
        logger.info("Waiting for login to complete...")
        await asyncio.sleep(10)
        browser.save_screenshot("google_login_complete.png")
        
        # Check if we're logged in
        current_url = browser.current_url
        logger.info(f"Current URL after login: {current_url}")
        
        if "myaccount.google.com" in current_url or "accounts.google.com/signin/v2/challenge" in current_url or "accounts.google.com/signin/rejected" not in current_url:
            logger.info("Login successful")
            return True
        else:
            logger.error(f"Login may have failed. Current URL: {current_url}")
            return False
            
    except Exception as e:
        logger.error(f"Error during Google login: {e}")
        browser.save_screenshot("login_general_error.png")
        return False

async def join_google_meet_direct(meet_code, duration_seconds=60):
    """Join a Google Meet directly using the system's Chrome profile."""
    meet_link = format_meet_link(meet_code)
    logger.info(f"Will connect directly to Google Meet: {meet_link}")
    
    browser = None
    try:
        browser = setup_browser()
        
        # Navigate directly to the Meet link
        logger.info(f"Navigating to Meet: {meet_link}")
        browser.get(meet_link)
        logger.info("Loaded Google Meet page")
        
        # Wait for page to fully load
        logger.info("Waiting for Meet page to fully load...")
        await asyncio.sleep(15)
        
        # Save screenshot of initial Meet page
        browser.save_screenshot("meet_initial_page.png")
        logger.info("Saved screenshot of initial Meet page")
        
        # Multiple possible join button selectors (expanded)
        join_button_selectors = [
            "button[aria-label='Join now']", 
            "button[aria-label='Ask to join']",
            "button[data-idom-class='nCP5yc AjY5Oe DuMIQc LQeN7 jEvJdc QJgwje']",
            "button[jsname='Qx7uuf']",
            "button[jsname='A5iH9e']",
            "button[jsname='CQylAd']",
            "button[jsname='K4r5Ff']",
            "button[data-id='join-button']",
            "button[data-tooltip='Join now']",
            "button.VfPpkd-LgbsSe.VfPpkd-LgbsSe-OWXEXe-k8QpJ",
            "button.join-button"
        ]
        
        # Wait again for the UI to stabilize
        logger.info("Waiting for join buttons to appear...")
        for i in range(5):  # Check multiple times with short waits in between
            await asyncio.sleep(3)
            logger.info(f"Still waiting for join button (attempt {i+1}/5)...")
            browser.save_screenshot(f"meet_waiting_{i}.png")
            
            # Dump page content for debugging
            try:
                page_title = browser.title
                page_url = browser.current_url
                logger.info(f"Page title: {page_title}")
                logger.info(f"Current URL: {page_url}")
                
                # Get any visible text
                body_text = browser.find_element(By.TAG_NAME, "body").text
                logger.info(f"Visible page text (first 200 chars): {body_text[:200]}")
                
                # Try to find any buttons
                buttons = browser.find_elements(By.TAG_NAME, "button") 
                logger.info(f"Found {len(buttons)} buttons on the page")
                for idx, button in enumerate(buttons[:5]):  # Log first 5 buttons
                    try:
                        logger.info(f"Button {idx}: Text='{button.text}', Displayed={button.is_displayed()}")
                    except:
                        logger.info(f"Button {idx}: [Could not get properties]")
            except Exception as e:
                logger.error(f"Error getting page details: {e}")
        
        # Try each selector with longer timeout
        join_button = None
        for selector in join_button_selectors:
            try:
                logger.info(f"Trying to find join button with selector: {selector}")
                join_button = WebDriverWait(browser, 15).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                )
                if join_button:
                    logger.info(f"Found join button with selector: {selector}")
                    browser.save_screenshot("join_button_found.png")
                    break
            except Exception:
                logger.info(f"Button not found with selector: {selector}")
                continue
        
        # Try XPath options if CSS selectors don't work
        if not join_button:
            logger.info("Trying XPath selectors...")
            xpath_selectors = [
                "//button[contains(., 'Join now')]",
                "//button[contains(., 'Ask to join')]",
                "//button[contains(text(), 'Join')]",
                "//button[contains(text(), 'Ask to join')]",
                "//*[@role='button' and contains(text(), 'Join')]",
                "//*[@role='button' and contains(text(), 'Ask to join')]",
                "//div[contains(@role, 'button')][contains(., 'Join')]",
                "//span[contains(text(), 'Join now')]/parent::*",
                "//span[contains(text(), 'Ask to join')]/parent::*"
            ]
            
            for xpath in xpath_selectors:
                try:
                    logger.info(f"Trying to find join button with XPath: {xpath}")
                    join_button = WebDriverWait(browser, 15).until(
                        EC.element_to_be_clickable((By.XPATH, xpath))
                    )
                    if join_button:
                        logger.info(f"Found join button with XPath: {xpath}")
                        browser.save_screenshot("join_button_found_xpath.png")
                        break
                except Exception:
                    logger.info(f"Button not found with XPath: {xpath}")
                    continue
        
        if join_button:
            # Click the join button
            logger.info("Clicking join button")
            join_button.click()
            logger.info("Clicked join button")
            
            # Save screenshot after clicking join
            browser.save_screenshot("meet_after_join.png")
            logger.info("Saved screenshot after clicking join")
            
            # Stay in the meeting for the specified duration
            logger.info(f"Staying in the meeting for {duration_seconds} seconds")
            await asyncio.sleep(duration_seconds)
            
            logger.info("Successfully stayed in Google Meet for the specified duration")
            return True
        else:
            # Try using JavaScript to find and click any join button
            logger.info("Trying JavaScript approach to find join buttons...")
            try:
                # JS to click any button containing 'Join' text or 'Ask to join' text
                result = browser.execute_script("""
                    var buttons = document.querySelectorAll('button');
                    var joinButtons = [];
                    
                    for (var i = 0; i < buttons.length; i++) {
                        if (buttons[i].innerText.includes('Join') || buttons[i].innerText.includes('Ask to join')) {
                            joinButtons.push(buttons[i].innerText);
                            buttons[i].click();
                            return 'Found and clicked: ' + buttons[i].innerText;
                        }
                    }
                    
                    // Try with broader selectors if button not found
                    var allElements = document.querySelectorAll('*');
                    for (var i = 0; i < allElements.length; i++) {
                        if ((allElements[i].innerText.includes('Join') || allElements[i].innerText.includes('Ask to join')) 
                            && (allElements[i].tagName === 'BUTTON' || allElements[i].role === 'button')) {
                            joinButtons.push(allElements[i].innerText);
                            allElements[i].click();
                            return 'Found and clicked element: ' + allElements[i].innerText;
                        }
                    }
                    
                    return 'No join buttons found. All buttons: ' + 
                        Array.from(document.querySelectorAll('button')).map(b => b.innerText || '[No text]').join(', ');
                """)
                logger.info(f"JavaScript execution result: {result}")
                browser.save_screenshot("meet_after_js_click.png")
                
                # Wait a bit to see if the JS click worked
                await asyncio.sleep(5)
                browser.save_screenshot("meet_after_js_wait.png")
                
                if result and "Found and clicked" in result:
                    logger.info("Join button clicked via JavaScript")
                    # Stay in the meeting for the specified duration
                    logger.info(f"Staying in the meeting for {duration_seconds} seconds")
                    await asyncio.sleep(duration_seconds)
                    return True
                else:
                    logger.error("Could not find join button with any method")
            except Exception as e:
                logger.error(f"JavaScript approach failed: {e}")
            
            logger.error("Could not find join button with any selector")
            
        # Final screenshot
        screenshot_path = "meet_final_screenshot.png"
        browser.save_screenshot(screenshot_path)
        logger.info(f"Saved final screenshot to {screenshot_path}")
        
        return False
    
    except Exception as e:
        logger.error(f"Error in Google Meet session: {str(e)}")
        if browser:
            # Take a screenshot of the error state
            try:
                screenshot_path = "meet_error_screenshot.png"
                browser.save_screenshot(screenshot_path)
                logger.info(f"Saved error screenshot to {screenshot_path}")
            except:
                pass
        return False
    
    finally:
        if browser:
            logger.info("Closing browser")
            browser.quit()

async def main():
    print("Starting Google Meet session...")
    meeting_code = 'aaf-rxtg-raj'
    email = "reynoldsvarcity@gmail.com"
    password = "hello*123#"
    
    # First, try direct connection to the meeting (without login)
    try:
        print("Trying to join meeting directly...")
        result = await join_google_meet_direct(meeting_code, 60)  # Join for 1 minute
        if result:
            print("Google Meet session completed successfully.")
            return
        else:
            print("Failed to join directly, will try with login...")
    except Exception as e:
        print(f"Error during direct connection: {e}")
        print("Will try with login instead...")
    
    # If direct connection fails, try with login
    try:
        browser = setup_browser()
        try:
            print(f"Logging in with email: {email}")
            login_success = await login_to_google(browser, email, password)
            
            if login_success:
                print("Login successful, now joining meeting...")
                # Navigate to the Meet link
                meet_link = format_meet_link(meeting_code)
                browser.get(meet_link)
                
                # Wait for page to fully load
                print("Waiting for Meet page to load...")
                await asyncio.sleep(15)
                browser.save_screenshot("meet_after_login.png")
                
                # Try to find and click join button
                join_button_found = False
                
                # Try common join button selectors
                join_button_selectors = [
                    "button[aria-label='Join now']", 
                    "button[aria-label='Ask to join']"
                ]
                
                for selector in join_button_selectors:
                    try:
                        print(f"Looking for join button: {selector}")
                        join_button = WebDriverWait(browser, 10).until(
                            EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                        )
                        join_button.click()
                        print("Clicked join button!")
                        browser.save_screenshot("after_join_click.png")
                        join_button_found = True
                        break
                    except Exception as e:
                        print(f"Button not found with selector {selector}: {e}")
                
                if join_button_found:
                    print("Successfully joined the meeting!")
                    await asyncio.sleep(60)  # Stay in the meeting for 1 minute
                    print("Google Meet session completed successfully.")
                else:
                    print("Could not find join button after login.")
            else:
                print("Login failed.")
        except Exception as e:
            print(f"Error during meeting connection with login: {e}")
        finally:
            print("Closing browser...")
            browser.quit()
    except Exception as e:
        print(f"Error setting up browser for login: {e}")

if __name__ == "__main__":
    asyncio.run(main()) 