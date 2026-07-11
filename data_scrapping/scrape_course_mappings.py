import argparse
import email
import csv
import sys
from bs4 import BeautifulSoup

def main():
    parser = argparse.ArgumentParser(description="Scrape course mappings from an MHTML file and output to CSV.")

    parser.add_argument("-m", "--mhtml", required=True, type=str, help="Path to the input MHTML file.")
    parser.add_argument("-c", "--csv", type=str, help="Path to the output CSV file.")

    # 3. Parse input arguments
    args = parser.parse_args()

    mhtml_file = args.mhtml
    csv_file = args.csv if args.csv else 'output.csv'
    scrape_mappings(mhtml_file, csv_file)

def scrape_mappings(mhtml_path, csv_path):
    print(f"Reading MHTML file from: {mhtml_path}...")
    try:
        with open(mhtml_path, 'r', encoding='utf-8', errors='ignore') as f:
            msg = email.message_from_file(f)
    except Exception as e:
        print(f"Error reading MHTML file: {e}")
        sys.exit(1)
        
    print("Finding the HTML part containing the course mappings table...")
    # Walk through parts to find the main HTML table part (Part 32 or any part of type text/html with large content)
    html_content = None
    for idx, part in enumerate(msg.walk()):
        content_type = part.get_content_type()
        if content_type == 'text/html':
            payload = part.get_payload(decode=True)
            if payload and len(payload) > 1000000:  # The main data part is extremely large (~16MB)
                html_content = payload.decode('utf-8', errors='ignore')
                print(f"Found main table in Part {idx} ({len(payload)} bytes).")
                break
                
    if not html_content:
        print("Error: Could not locate the main HTML table part in the MHTML file.")
        sys.exit(1)
        
    print("Parsing HTML with BeautifulSoup (using lxml parser)...")
    soup = BeautifulSoup(html_content, 'lxml')
    
    # Locate all table rows for mapping
    # Rows have IDs like: trN_EXSP_DRVD$0_row1, trN_EXSP_DRVD$0_row2, etc.
    rows = soup.find_all('tr', id=lambda x: x and x.startswith('trN_EXSP_DRVD$0_row'))
    total_rows = len(rows)
    print(f"Located {total_rows} course mapping rows in the HTML table.")
    
    headers = [
        'Faculty', 
        'Partner University', 
        'PU Course', 
        'PU Course Title', 
        'PU Course Units', 
        'NUS Course', 
        'NUS Course Title', 
        'NUS Course Units', 
        'Pre Approved'
    ]
    
    print(f"Writing parsed data to: {csv_path}...")
    try:
        with open(csv_path, 'w', newline='', encoding='utf-8-sig') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(headers)
            
            written_count = 0
            for row in rows:
                tds = row.find_all('td')
                if len(tds) < 15:
                    # Skip invalid/header rows just in case
                    continue
                
                # Helper to extract and clean cell text
                def get_clean_text(td_element):
                    t = td_element.get_text(strip=True)
                    # Replace non-breaking spaces (\xa0 or &nbsp;) and trim
                    return t.replace('\xa0', '').strip()
                
                faculty = get_clean_text(tds[0])
                partner_univ = get_clean_text(tds[1])
                pu_code = get_clean_text(tds[2])
                pu_title = get_clean_text(tds[3])
                pu_units = get_clean_text(tds[4])
                
                nus_code = get_clean_text(tds[8])
                nus_title = get_clean_text(tds[9])
                nus_units = get_clean_text(tds[10])
                
                # Checkbox check: look for an input checkbox in Col 14
                checkbox = tds[14].find('input', type='checkbox')
                pre_approved = False
                if checkbox:
                    pre_approved = checkbox.has_attr('checked')
                
                writer.writerow([
                    faculty,
                    partner_univ,
                    pu_code,
                    pu_title,
                    pu_units,
                    nus_code,
                    nus_title,
                    nus_units,
                    pre_approved
                ])
                written_count += 1
                
        print(f"Successfully scraped and wrote {written_count} course mapping entries to {csv_path}.")
    except Exception as e:
        print(f"Error writing CSV file: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
